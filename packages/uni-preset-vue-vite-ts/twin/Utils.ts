import * as THREE from "three";
import { CreateTwin } from "./CreateTwin";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// 遍历批量销毁geometry和material
export const disposeNode = (node: THREE.Object3D) => {
  if (node instanceof THREE.Mesh) {
    if (node.geometry) {
      node.geometry.dispose();
    }

    if (node.material) {
      if (node.material instanceof Array) {
        node.material.forEach((item: { dispose: () => void }) => {
          item.dispose();
        });
      }
    }

    if (node.material instanceof THREE.Material) {
      node.material.dispose();
    }
  }
};

/*
 * @box3Center() 获取包围盒中心坐标
 * @params: (mesh: 当前的网格模型对象)
 */
export const box3Center = (mesh: THREE.Object3D<THREE.Object3DEventMap>) => {
  const box3 = new THREE.Box3();
  box3.setFromObject(mesh);
  const center = new THREE.Vector3();
  box3.getCenter(center);
  mesh.position.sub(center);
  return center;
};

/*
 *@getRayCasterPoint() 获取相交点的坐标(有法线的点)
 *@params: (event: 事件对象, twin: threejs 实例)
 */
export const getRayCasterPoint = (event: MouseEvent, twin: CreateTwin) => {
  const { width, height, camera, scene } = twin;
  const px = event.offsetX;
  const py = event.offsetY;
  // 屏幕坐标转标准设备坐标
  const x = (px / width) * 2 - 1;
  const y = -(py / height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  // 在点击位置生成相交的射线
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  // 射线交叉计算拾取模型
  const intersects = raycaster.intersectObject(scene, true);
  const result = intersects?.filter((item: { object: { name: any } }) => {
    // && item.object.name.includes('剖面序号')
    if (item.object.name) {
      return item;
    }
  });

  let point: THREE.Vector3 | null = null;
  if (result.length > 0) {
    // 获取模型上选中的一点坐标
    point = result[0].point;
  }

  return {
    point,
    mesh: result[0],
  };
};

/*
 *@createSphere() 生成测距线两端的红色小球
 *@params:(point:当前点的三维坐标, camera:当前实例的相机属性)
 */
export const createSphere = (
  point: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  num = 100
) => {
  const L = camera.position.clone().sub(point).length();
  const geometry = new THREE.SphereGeometry(L / num);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
  });
  const sphere = new THREE.Mesh(geometry, material);
  const quaternion = new THREE.Quaternion();
  sphere.quaternion.multiply(quaternion);
  const el = point.clone();
  // el.x += 0.01;
  sphere.position.copy(el);
  return sphere;
};

/*
 *@createRectPoints() 通过任意2点画出对角线，然后根据对角线的两点计算出另外2个点的坐标
 *@params:(startPoint: 起始点三维坐标, endPoint: 结束点三维坐标)
 */
export const createRectPoints = (
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3
) => {
  // 暂定对角线起始点分别为A,B
  // 4个点按逆时针依次是：A,D,B,C
  const C = new THREE.Vector3(endPoint.x, startPoint.y, endPoint.z);
  const D = new THREE.Vector3(startPoint.x, endPoint.y, startPoint.z);
  const result = [];
  result.push(startPoint, D, endPoint, C);
  // result = result.map((item) => {
  //     const el = item.clone();
  //     // el.x += 0.01;
  //     return el;
  // });
  return result;
};

/*
 *@getDistance() 获取两点之间的距离
 *@params:(startPoint: 起始点三维坐标, endPoint: 结束点三维坐标, num: 小数点后保留几位小数，默认保留2位)
 */
export const getDistance = (
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3
) => {
  const len = startPoint.clone().sub(endPoint).length();
  const lenmm = parseInt(String(len * 1000)); // mm 代表毫米
  return lenmm;
};

/*
 *deleteIcon() 测距功能的删除图标
 *@params:(point: 三维坐标,hole：管孔直径)
 */
export const deleteIcon = (point: THREE.Vector3, rangingNum: number) => {
  const div = document.createElement("div");
  div.style.color = "#ff0";
  div.innerHTML = "x";
  const delIcon = new CSS2DObject(div);
  point.y -= 0.006;
  const type = "测距";
  const name = "删除";
  delIcon.position.copy(point);
  delIcon.name = `${type}-${type}:${rangingNum}-${name}`;
  delIcon.userData = {
    type,
    rangingNum,
    name,
  };
  return delIcon;
};

/*
 * 测距函数
 *
 */
export const rangingFn = (
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  rangingNum: number
) => {
  const line1 = new THREE.LineCurve3(startPoint, endPoint);
  const path: THREE.CurvePath<THREE.Vector3> = new THREE.CurvePath();
  path.curves.push(line1);

  const geometry = new THREE.TubeGeometry(path.clone(), 40, 0.003, 100);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
  });
  const line = new THREE.Mesh(geometry, material);
  const lineType = "测距";
  const lineName = "线";

  line.name = `${lineType}-${lineType}:${rangingNum}-${lineName}`;
  line.userData = {
    type: lineType,
    name: lineName,
    rangingNum,
  };

  const div = document.createElement("div");
  div.style.color = "#fff";
  div.style.padding = "2px 6px";
  div.style.borderRadius = "3px";
  div.style.background = "rgba(0, 0, 0, 0.4)";
  div.innerHTML = `${getDistance(startPoint, endPoint)}`;

  const size = new CSS2DObject(div);
  const sizeType = "尺寸";
  size.name = `${lineType}-${lineType}:${rangingNum}-${sizeType}`;
  size.userData = {
    type: lineType,
    name: sizeType,
    rangingNum,
  };
  const center = startPoint.clone().add(endPoint).divideScalar(2);
  size.position.copy(center);

  const delIcon = deleteIcon(endPoint, rangingNum);
  delIcon.position.copy(endPoint);

  return {
    line,
    size,
    delIcon,
  };
};

/*
 *@drawRectWithFourPoints() 根据四个点的三维坐标画矩形
 *@parmas:(points: 4个点的三维坐标数组)
 */
export const drawRectWithFourPoints = (
  points: THREE.Vector3[],
  name?: string
) => {
  // 创建多段线条的顶点数据
  const p1 = points[0]; // a,d,b,c
  const p2 = points[1];
  const p3 = points[2];
  const p4 = points[3];

  // 4条3D线段
  const line1 = new THREE.LineCurve3(p1, p2);
  const line2 = new THREE.LineCurve3(p2, p3);
  const line3 = new THREE.LineCurve3(p3, p4);
  const line4 = new THREE.LineCurve3(p4, p1);

  // CurvePath 是组合曲线的api
  const path: THREE.CurvePath<THREE.Vector3> = new THREE.CurvePath();
  path.curves.push(line1, line2, line3, line4);

  const geometry = new THREE.TubeGeometry(path.clone(), 300, 0.01);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
  });
  const line = new THREE.Mesh(geometry, material);
  line.name = name;
  return line;
};

/*
 *@createMarkSize() 根据起始三维坐标生成标注尺寸网格模型
 *@params:(startPoint: 起始点三维坐标, endPoint: 结束点三维坐标, length: 标注的长度尺寸)
 */
export const createMarkLength = (
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  length: number,
  pageNum?: number
) => {
  const div = document.createElement("div");
  div.style.color = "#fff";
  div.style.padding = "2px 6px";
  div.style.borderRadius = "3px";
  div.style.background = "rgba(0, 0, 0, 0.4)";
  div.innerHTML = `${length}`;

  const size = new CSS2DObject(div);
  const center = startPoint.clone().add(endPoint).divideScalar(2);
  size.position.copy(center);
  const eventType = "drag";
  const type = "剖面";
  const name = "尺寸";
  size.name = `${eventType}-剖面序号${pageNum}-${name}`;
  size.userData = {
    name,
    pageNum,
    type,
    eventType,
  };
  return size;
};

/*
 *createDirectionNorth() 创建剖面的方向 正北
 *@params: (startPoint: 起始点三维坐标, endPoint: 结束点三维坐标, pageNum: 当前剖面的序号)
 */
export const createDirectionNorth = (
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  pageNum: number
) => {
  const div = document.createElement("div");
  div.style.color = "#fff";
  div.style.fontSize = "80px";
  div.style.opacity = "0.4";
  div.innerHTML = `北`;

  const north = new CSS2DObject(div);
  const center = startPoint.clone().add(endPoint).divideScalar(2);
  north.position.copy(center);
  const eventType = "drag";
  const type = "剖面";
  const name = "方向";
  north.name = `${eventType}-剖面序号${pageNum}-${name}`;
  north.userData = {
    name, 
    pageNum,
    type,
    eventType,
  };
  return north;
};

/*
 *@createLine() 两点创建一条线段
 *@params:(startPoint: 起始点三维坐标, endPoint: 结束点三维坐标)
 */
export const createLine = (
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3
) => {
  const { x: x1, y: y1, z: z1 } = startPoint;
  const { x: x2, y: y2, z: z2 } = endPoint;
  const material = new THREE.LineBasicMaterial({
    color: 0xffff00,
    depthTest: false,
  });
  // 创建一个几何体对象
  const geometry = new THREE.BufferGeometry();
  // 类型数组创建顶点数据
  const vertices = new Float32Array([x1, y1, z1, x2, y2, z2]);
  geometry.attributes.position = new THREE.BufferAttribute(vertices, 3);
  const line = new THREE.LineSegments(geometry, material);
  return line;
};

/*
 *css2RendererStyle() css2d 标注的样式
 *@params: (twin: threejs 实例)
 */
export const css2RendererStyle = (twin: CreateTwin) => {
  twin.css2Renderer.domElement.style.position = "absolute";
  twin.css2Renderer.domElement.style.top = "80px";
  twin.css2Renderer.domElement.style.pointerEvents = "none";
};

// 创建剖面右上角点击选中的立方体
// export const drewPlaneActiveBox = (C: THREE.Vector3, pageNum: number) => {
//   const geometry = new THREE.BoxGeometry(0.02, 0.08, 0.1);
//   const material = new THREE.MeshBasicMaterial({
//     color: 0xffff00,
//   });
//   const cube = new THREE.Mesh(geometry, material);
//   cube.position.copy(C);
//   const eventType = "drag";
//   const type = "剖面";
//   const name = "选中";
//   cube.name = `${eventType}-剖面序号${pageNum}-${name}`;
//   cube.userData = {
//     eventType,
//     pageNum,
//     name,
//     type,
//   };
//   return cube;
// };

// 创建圆形管孔内的电缆
export const drewHoleCable = (
  point: THREE.Vector3,
  hole: number,
  holeNum: number
) => {
  const geometry = new THREE.CircleGeometry(0.03);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
  });
  const circle = new THREE.Mesh(geometry, material);

  circle.position.copy(point);
  circle.rotateY(Math.PI / 2);
  const shape = "圆形管孔";
  const name = "电缆";
  circle.name = `${shape}-直径${hole}:${holeNum}-${name}`;
  circle.userData = {
    hole,
    shape,
    name,
    holeNum,
  };

  return circle;
};

/*
 *drewRect() 用起始点坐标绘制剖面标注，并标注当前剖面的序号
 * @params: (startPoint: 起始点三维坐标, endPoint: 结束点三维坐标, pageNum: 当前剖面的序号)
 */
export const drewRect = (
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  pageNum: number
) => {
  const points = createRectPoints(startPoint, endPoint);
  const eventType = "drag";
  const type = "剖面";
  const name = "线";
  const rect = drawRectWithFourPoints(
    points,
    `${eventType}-剖面序号${pageNum}-${name}`
  );
  rect.userData = {
    eventType,
    pageNum,
    name,
    type,
  };

  // 逆时针顺序解构出对应的4个顶点
  const [A, D, B, C] = points;

  // 井长
  const length = getDistance(A, C);
  const sizeAC = createMarkLength(A, C, length, pageNum);
  const sizeDB = createMarkLength(D, B, length, pageNum);

  // 井宽: 注意，仅适用于需要正确标注的剖面，若在非标注剖面标注计算逻辑会受到影响
  const sWidthmm = Math.abs(startPoint.x) * 1000;
  const eWidthmm = Math.abs(endPoint.x) * 1000;
  const width = parseInt(((sWidthmm + eWidthmm) / 2).toString());

  // 井深 即 height
  const depth = getDistance(A, D);
  const sizeAD = createMarkLength(A, D, depth, pageNum);
  const sizeCB = createMarkLength(C, B, depth, pageNum);

  return {
    length,
    width,
    depth,
    rect,
    sizeAC,
    sizeDB,
    sizeAD,
    sizeCB,
  };
};
/*
 *drewCircleHole() 绘制圆形管孔
 *@params:(point: 三维坐标,hole：管孔直径)
 */
export const drewCircleHole = (
  point: THREE.Vector3,
  hole: number,
  holeNum: number
) => {
  const radius = hole / (1000 * 2);
  const tube = 0.012; // 即圆弧线的粗细
  // 圆环几何体
  const geometry = new THREE.TorusGeometry(radius, tube);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide,
  });

  const torus = new THREE.Mesh(geometry, material);
  const shape = "圆形管孔";
  const name = "管孔";
  torus.userData = {
    shape,
    hole,
    holeNum,
    name,
  };
  torus.position.copy(point);
  torus.rotateY(Math.PI / 2);
  torus.name = `${shape}-直径${hole}:${holeNum}-${name}`;

  const circle = drewHoleCable(point, hole, holeNum);
  return {
    torus,
    circle,
  };
};

/*
 *createHoleSize() 创建管孔尺寸
 *@params: (event: Event 对象)
 */
export const createHoleSize = (
  point: THREE.Vector3,
  hole: number,
  holeNum: number
) => {
  const div = document.createElement("div");
  div.style.color = "#fff";
  div.style.padding = "2px 6px";
  div.style.borderRadius = "3px";
  div.style.background = "rgba(0, 0, 0, 0.4)";
  div.innerHTML = `${hole}`;

  const holeSize = new CSS2DObject(div);
  // 以鼠标位置为中心
  holeSize.position.copy(point);
  holeSize.position.y += hole / 1500;
  const shape = "圆形管孔";
  const name = "尺寸";
  holeSize.name = `${shape}-直径${hole}:${holeNum}-${name}`;

  holeSize.userData = {
    shape,
    name,
    hole,
    holeNum,
  };
  return holeSize;
};

/*
 *getChromeVersion() 获取当前浏览器的版本并检测是否支持WebGPU
 *chrome 浏览器在113版本开始支持WebGPU

需要考虑很多浏览器类型 比如chrome,firfox,safari浏览器等等
 */
// export const getChromeVersion = () => {
//     const rawUserAgent = navigator.userAgent.toLowerCase();
//     const match = rawUserAgent.match(/chrome\/([\d.]+)/);

//     if ('gpu' in window.navigator) {
//         console.log(`当前浏览器版本是:${match?.[1]}支持WebGPU。`);
//         return;
//     } else {
//         console.warn(`当前浏览器版本是:${match?.[1]}不支持WebGPU，请升级到最新版本。`);
//         return;
//     }
// };

/*
 *average() 求工井长宽高的平均值
 *@params: (list:组装好的剖面数据, type：类型分别是 length，width，depth)
 */
export const average = (list: any[], type = "width") => {
  const val =
    list.reduce((acc: number, cur: number) => acc + parseFloat(cur[type]), 0) /
    list.length;

  return val;
};

// 包围盒是否包含某个管孔
export const box3IsContainsBox = (
  plane: { p1: { x: any; y: any; z: any }; p2: { x: any; y: any; z: any } },
  hole: any,
  twin: any
) => {
  const { x: sx, y: sy, z: sz } = plane.p1;
  const { x: ex, y: ey, z: ez } = plane.p2;

  // 剖面包围盒
  const box3Plane = new THREE.Box3();

  // 管孔包围盒
  const box3Hole = new THREE.Box3();
  // 计算模型最小包围盒
  box3Hole.expandByObject(hole);

  // 允许剖面最小包围盒存在的误差范围
  const temp = 0.05;
  box3Plane.min = new THREE.Vector3(
    Math.min(sx, ex) - temp,
    Math.min(sy, ey),
    Math.min(sz, ez)
  );
  box3Plane.max = new THREE.Vector3(
    Math.max(sx, ex) + temp,
    Math.max(sy, ey),
    Math.max(sz, ez)
  );

  // 检查 box3Plane 是否包含 box3Hole
  const bool = box3Plane.containsBox(box3Hole);

  // 剖面包围盒辅助线
  // const helperPlane = new THREE.Box3Helper(box3Plane, 0xff0000);
  // 管孔包围盒辅助线
  // twin.scene.remove(helperHole);
  // const helperHole = new THREE.Box3Helper(box3Hole, 0x0000ff);

  // twin.scene.add(helperPlane, helperHole);

  return bool;
};
// 包围盒是否包含某个点
export const box3IsContainsPoint = (
  plane: { p1: { x: any; y: any; z: any }; p2: { x: any; y: any; z: any } },
  point: any,
  twin: CreateTwin
) => {
  const { x: sx, y: sy, z: sz } = plane.p1;
  const { x: ex, y: ey, z: ez } = plane.p2;

  // 剖面包围盒
  const box3Plane = new THREE.Box3();

  // 管孔包围盒
  // const box3Hole = new THREE.Box3();
  // // 计算模型最小包围盒
  // box3Hole.expandByObject(hole);

  // 允许剖面最小包围盒存在的误差范围
  const temp = 0.05;
  box3Plane.min = new THREE.Vector3(
    Math.min(sx, ex) - temp,
    Math.min(sy, ey),
    Math.min(sz, ez)
  );
  box3Plane.max = new THREE.Vector3(
    Math.max(sx, ex) + temp,
    Math.max(sy, ey),
    Math.max(sz, ez)
  );

  // 检查 box3Plane 是否包含 box3Hole
  const bool = box3Plane.containsPoint(point);

  // 剖面包围盒辅助线
  // const helperPlane = new THREE.Box3Helper(box3Plane, 0xff0000);
  // 管孔包围盒辅助线
  // twin.scene.remove(helperHole);
  // const helperHole = new THREE.Box3Helper(box3Hole, 0x0000ff);

  // twin.scene.add(helperPlane, helperHole);
  // twin.scene.add(helperPlane);

  return bool;
};

// 移除实时创建的网格模型
// export const removePlanes = (twin: CreateTwin) => {
//   twin.scene.traverse((item: any) => {
//     // 移除双击创建的网格模型
//     if (item.isGroup) {
//       const groupedByName: any = {};
//       // 把拖拽的同一个剖面标注的数据放在同一个数组
//       item.children.forEach((el: any) => {
//         const sName = el.name.slice(0, 10);
//         if (!groupedByName[sName]) {
//           groupedByName[sName] = [];
//         }

//         groupedByName[sName].push(el);
//       });

//       // 从同一个数组中删除最后一次滚动之前的数据，保留最后一次拖拽的剖面标注数据
//       for (const key in groupedByName) {
//         if (Object.prototype.hasOwnProperty.call(groupedByName, key)) {
//           const record = groupedByName[key];
//           const startRecord = record.slice(0, record.length - 7);
//           item.remove(...startRecord);
//         }
//       }
//     }
//   });
// };

// 三维坐标转二维坐标
export const transform3DCoordsTo2D = (camera: THREE.Camera, point: any) => {
  // 假设camera是你的相机对象，renderer是你的渲染器对象
  const vector = new THREE.Vector3(...point); // x, y, z 是你想要转换的三维坐标
  vector.project(camera);

  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;

  vector.x = vector.x * halfWidth + halfWidth;
  vector.y = -(vector.y * halfHeight) + halfHeight;

  // 此时 vector.x 和 vector.y 是屏幕坐标
  return {
    x: parseInt(vector.x.toString()),
    y: parseInt(vector.y.toString()),
  };
};
