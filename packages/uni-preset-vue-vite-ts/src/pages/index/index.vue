<template>
  <wd-tabs v-model="tabToolName" @change="onTabToolsChange">
    <block v-for="item in tabTools" :key="item">
      <wd-tab :title="item" :name="item" />
    </block>
  </wd-tabs>

  <wd-tabs v-model="tabViewName" @change="onTabViewsChange">
    <block v-for="item in tabViews" :key="item">
      <wd-tab :title="item" :name="item" />
    </block>
  </wd-tabs>

  <div ref="webgl"></div>

  <wd-row class="footer" v-show="tabToolName === '标剖面'">
    <wd-button :disabled="!selectPlane" @click="onDeletePlane">删除剖面</wd-button>
    <wd-button hairline :disabled="!selectPlane" @click="onPlaneAttrShow">剖面属性</wd-button>
  </wd-row>
  <wd-row class="footer" v-show="tabToolName === '标管孔'">
    <wd-button :disabled="!selectHole" @click="onDeleteHole">删除管孔</wd-button>
    <wd-button hairline :disabled="!selectHole" @click="onHoleAttrShow">管孔属性</wd-button>
  </wd-row>

  <!-- 剖面属性弹框 -->
  <plane-attr-modal :show="planeAttrShow" @close="onClosePlaneAttr" />

  <!-- 管孔属性弹框 -->
  <hole-attr-modal :show="holeAttrShow" @close="onCloseHoleAttr" />

  <!-- 需要在页面中引入该组件wd-toast，作为挂载点。 -->
  <wd-toast />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import {
  CreateTwin,
  box3Center,
  getRayCasterPoint,
  createSphere,
  css2RendererStyle,
  drewRect,
  drewCircleHole,
  average,
  createHoleSize,
  box3IsContainsBox,
  box3IsContainsPoint,
  removePlanes,
  rangingFn,
  createDirectionNorth,
} from "../../../twin";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useToast } from "wot-design-uni";
import UsePlaneDrag from "./usePlaneDrag";
import UseHoleDrag from "./useHoleDrag";
import PlaneAttrModal from "./PlaneAttrModal.vue";
import HoleAttrModal from "./HoleAttrModal.vue";

const toast = useToast();

const tabTools = ["浏览", "标剖面", "标管孔", "测距", "立视图"];
const tabToolName = ref<string>("标剖面");

const tabViews = ["主视图", "左视图", "俯视图", "重置", "未标注", "已标注"];
const tabViewName = ref<string>("重置");
const webgl = ref<HTMLDivElement | null>(null);
const twin = new CreateTwin();
const loader = new GLTFLoader();

let clickNum: number = 0; // 记录点击次数
let p1: THREE.Vector3 | null = null; // 起点坐标
let p2: THREE.Vector3 | null = null; // 终点坐标
let pageNum: number = 1; // 剖面的序号

let sphereEndDragList: any = []; // 剖面终点小球列表

const planeGroup = new THREE.Group(); // 一个独立的剖面标注组

let sphereStart: any; // 起点小红点
let sphereEnd: any; // 终点小红点
const isDeletePlane = ref<boolean>(false); // 删除剖面标注

const planeParamsList: any = []; // 剖面参数列表
const holeParamsList = []; // 管孔参数列表

// 剖面属性
const planeAttrShow = ref<boolean>(false);
const selectPlane = ref();
const isActivedPlane = ref<boolean>(false); // 剖面是否处于选中态

// 管孔属性
const holeAttrShow = ref<boolean>(false);
const selectHole = ref();
// const isActivedHole = ref<boolean>(false); // 管孔是否处于选中态

// 管孔属性
const hole = ref<number>(175); // 管孔直径尺寸
let holeNum: number = +new Date(); // 管孔序号为了保证唯一使用时间戳
let holeDragList: any = []; // 圆形管孔列表
// const holeGroup = new THREE.Group();

// 测距组
// const rangingGroup = new THREE.Group();
let rangingSphereStart: any; // 起点小红点
let rangingSphereEnd: any; // 终点小红点
let rangingP1: THREE.Vector3 | undefined; // 测距起点坐标
let rangingP2: THREE.Vector3 | undefined; // 测距终点坐标
let rangingClickNum: number = 0; // 测距点击次数
let rangingNum: number; // 测距序号为了保证唯一使用时间戳

UsePlaneDrag({ twin, sphereEndDragList, planeParamsList });

const { holeDragedList } = UseHoleDrag({ twin, holeDragList, hole: hole.value, holeNum });

// 切换工具栏
const onTabToolsChange = (item: { name: string; index: number }) => {
  tabToolName.value = item.name;
  twin.scene.traverse((obj) => {
    const udName = obj.userData.name;
    if (item.name === '浏览' && udName && udName !== 'Node' && tabViewName.value === '未标注') {
      obj.visible = false;
    } else {
      obj.visible = true;
    }
  });
};

// 视图快捷键
const onTabViewsChange = (item: { name: string }) => {
  tabViewName.value = item.name;

  const viewMap = {
    "主视图": [2, 0, 0],
    "左视图": [0, 0, 2],
    "俯视图": [0, 3.4, 0],
    "重置": [2, 2, 2],
  };

  if (item?.name && !["未标注", "已标注"].includes(item.name)) {
    twin.camera.position.set(...viewMap[item.name]);
  }

  twin.camera.lookAt(0, 0, 0);

  twin.scene.traverse((obj) => {
    const udName = obj.userData.name;
    if (tabToolName.value === '浏览' && udName && udName !== 'Node' && item.name === '未标注') {
      obj.visible = false;
    } else {
      obj.visible = true;
    }
  });
};

// 加载gltf文件
loader.load("src/static/textured_output08.gltf", (gltf) => {
  const mesh = gltf.scene.children[0];
  box3Center(mesh);
  mesh.translateY(0.4);
  twin.scene?.add(mesh);
});

// 射线拾取结果处理
const rayCasterPoint = (event: MouseEvent) => {
  const { point } = getRayCasterPoint(event, twin);
  if (point) {
    return point;
  } else {
    toast.warning("请点击模型非空区域");
    return null;
  }
};

// 画小圆点
const drawSphere = (point: THREE.Vector3, _name: string) => {
  if (!point) {
    toast.warning("请点击模型非空区域xx");
    return null;
  }
  const sphere = createSphere(point, twin.camera);
  const eventType = "drag";
  sphere.name = `${eventType}-剖面序号${pageNum}-${_name}`;
  sphere.userData = {
    pageNum,
    name: _name,
    eventType,
    type: "剖面",
  };
  return sphere;
};

// 绘制剖面
const onDrewPlane = (event: MouseEvent) => {
  clickNum += 1;
  if (clickNum === 1) {
    const point = rayCasterPoint(event);
    if (!point) return;
    p1 = point;
    sphereStart = drawSphere(point, "起点坐标");

    planeGroup.add(sphereStart);
    twin.scene.add(planeGroup);
  } else {
    const point = rayCasterPoint(event);
    if (!point) return;
    p2 = point;
    if (p1 && p2) {
      // 画剖面
      const {
        length,
        width,
        depth,
        rect,
        sizeAC,
        sizeDB,
        sizeAD,
        sizeCB,
      } = drewRect(p1, point, pageNum);
      sphereEnd = drawSphere(point, "终点坐标");
      planeGroup.add(
        sizeAC,
        sizeDB,
        sizeAD,
        sizeCB,
        rect,
        sphereStart,
        sphereEnd
      );

      twin.scene.add(planeGroup);

      const params = {
        p1,
        p2,
        pageNum,
        length,
        width,
        depth,
        holeList: [],
        sphereStart,
        sphereEnd,
      };
      planeParamsList.push(params);

      pageNum += 1;
    }
    clickNum = 0;
    p1 = null;
    p2 = null;
  }
};

// 打开剖面属性弹框
const onPlaneAttrShow = () => {
  planeAttrShow.value = true;
};

// 删除剖面
const onDeletePlane = () => {
  let planeArr: THREE.Object3D<THREE.Object3DEventMap>[] = [];
  const moName = selectPlane.value.name?.split("-")?.[1];

  twin.scene.children.forEach((item) => {
    // 剖面
    item?.children?.forEach((el) => {
      if (el.name?.includes(moName) && el.userData.type === "剖面") {
        planeArr.push(el);
      }
    });

    // 移除剖面
    item.remove(...planeArr);
  });
};

// 删除管孔
const onDeleteHole = () => {
  let holeArr: THREE.Object3D<THREE.Object3DEventMap>[] = []; // 管孔数组
  const moName = selectHole.value.name?.split("-")?.[1];

  twin.scene.children.forEach((item) => {
    // 把管孔相关的放在一个数组
    if (item.name.includes(moName)) {
      holeArr.push(item);
    }
  });

  // 移除管孔
  if (selectHole.value.name.includes("圆形管孔")) {
    twin.scene.remove(...holeArr);
  }
};

// 删除测距
const onDeleteRanging = (mesh) => {
  let rangingArr: THREE.Object3D<THREE.Object3DEventMap>[] = []; // 测距数组

  const moName = mesh.object.name?.split("-")?.[1];

  twin.scene.children?.forEach((item) => {
    if (item.name?.includes(moName) && item.userData.type === "测距") {
      rangingArr.push(item);
    }
  });

  // 移除测距
  if (mesh.object.name.includes("测距")) {
    twin.scene.remove(...rangingArr);
  }
};

const onHoleAttrShow = () => {
  holeAttrShow.value = true;
};

// 绘制管孔
const onDrewHole = (event: MouseEvent) => {
  holeNum = +new Date();
  const point = rayCasterPoint(event);
  if (!point) return;
  const { torus, circle } = drewCircleHole(point, hole.value, holeNum);
  const holeSize = createHoleSize(point, hole.value, holeNum);

  twin.scene.add(torus, circle, holeSize);
  holeDragList.push(torus);

  // console.log('circle.name', circle.name);
  // const holeParams = {
  //   hole: hole.value,
  //   point,
  //   mesh: ellipse,
  // };

  // holeParamsList.push(cloneDeep(holeParams)); // 深拷贝之后就不能修改管孔颜色了
};

// 删除
// const onDelete = (
//   mesh: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>
// ) => {
//   let planeArr: THREE.Object3D<THREE.Object3DEventMap>[] = []; // 剖面数组
//   let holeArr: THREE.Object3D<THREE.Object3DEventMap>[] = []; // 管孔数组
//   let rangingArr: THREE.Object3D<THREE.Object3DEventMap>[] = []; // 测距数组
//   const moName = mesh.object.name?.split("-")?.[1];

//   twin.scene.children.forEach((item) => {
//     // 剖面
//     item?.children?.forEach((el) => {
//       if (el.name?.includes(moName) && el.userData.type === "剖面") {
//         planeArr.push(el);
//       }
//     });

//     // 把管孔相关的放在一个数组
//     if (item.name.includes(moName)) {
//       holeArr.push(item);
//     }

//     // 测距
//     if (item.name?.includes(moName) && item.userData.type === "测距") {
//       rangingArr.push(item);
//     }

//     // 移除剖面
//     item.remove(...planeArr);
//   });

//   // 移除管孔
//   if (mesh.object.name.includes("圆形管孔")) {
//     twin.scene.remove(...holeArr);
//   }

//   // 移除测距
//   if (mesh.object.name.includes("测距")) {
//     twin.scene.remove(...rangingArr);
//   }
// };

// 剖面的选中态切换
const onPlaneActiveToggle = (mesh: any) => {
  selectPlane.value = mesh?.object;
  // 当前选中的剖面序号，如：剖面序号1
  const moName = mesh.object.name.slice(5, 10);

  // 递归处理剖面的选中态
  twin.scene.children?.forEach((item: any) => {
    if (!item.isGroup) return;
    item.children?.forEach((ele: any) => {
      isActivedPlane.value = !isActivedPlane.value;
      // 当前剖面的选中状态
      if (ele.name.slice(5, 10) === moName) {
        // 把选中的当前剖面的线变为浅蓝色
        if (["线"].includes(ele.userData.name)) {
          ele.material?.color.set(0x00ffff);
          // 把选中的当前剖面的'选中块'变为浅蓝色
        }
      } else {
        // 其他剖面的选中状态
        if (["线"].includes(ele.userData.name)) {
          ele.material?.color.set(0xffff00);
        } else if (["方向"].includes(ele.userData.name)) {
          planeGroup.remove(ele);
        }
      }
    });
  });
};

// 管孔选中态切换(仅点击管孔的时候允许切换颜色)
const onHoleActiveToggle = (
  mesh: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>
) => {
  selectHole.value = mesh?.object;
  const moName = mesh.object.name.split("-")[1];

  twin.scene.children?.forEach((item: any) => {
    // 排除 平行光、环境光、坐标轴和scanner模型
    const { isDirectionalLight, isAmbientLight, isLineSegments, name } = item;
    if (
      isDirectionalLight ||
      isAmbientLight ||
      isLineSegments ||
      name === "Node"
    )
      return;

    if (item.userData.name === "管孔" && item.name.split("-")[1] === moName) {
      // 当前管孔设置为选中色
      item.material?.color.set(0x00ffff);
    } else if (item.userData.name === "管孔") {
      // 其他管孔颜色设置为默认色
      item.material?.color.set(0xffff00);
    }
  });
};

// 测距功能点击生成红色小球
const rangingClick = (event: MouseEvent, rangingNum: number, _name: string, num?: number) => {
  const { point } = getRayCasterPoint(event, twin);
  if (!point) {
    toast.warning("请点击模型非空区域");
    return;
  }

  const sphere = createSphere(point, twin.camera, num);
  if (!sphere) return;
  const type = "测距";
  const name = `${_name}点坐标`;
  sphere.name = `${type}-${type}:${rangingNum}-${name}`;
  sphere.userData = {
    type,
    name,
    rangingNum,
  };

  return {
    point,
    sphere,
  };
};

// 测距功能
const onDrewRanging = (event: MouseEvent) => {
  rangingClickNum += 1;
  if (rangingClickNum === 1) {
    rangingNum = +new Date();
    const { point, sphere } = rangingClick(event, rangingNum, "起", 200) as any;
    rangingP1 = point;
    twin.scene.add(sphere);
  } else {
    const { point, sphere } = rangingClick(event, rangingNum, "终", 200) as any;
    rangingP2 = point;
    twin.scene.add(sphere);

    if (rangingP1 && rangingP2) {
      const { line, size, delIcon } = rangingFn(
        rangingP1,
        rangingP2,
        rangingNum
      );
      // rangingGroup.add(line, size, delIcon);
      // rangingGroup.name = '测距组';
      // rangingGroup.userData = {
      //   type: '测距组'
      // };
      twin.scene.add(line, size, delIcon);
    }

    rangingClickNum = 0;
    rangingP1 = undefined;
    rangingP2 = undefined;
  }
};

const onClick = (event: MouseEvent) => {
  event.preventDefault();
  const { mesh } = getRayCasterPoint(event, twin);

  if (tabToolName.value === "标剖面") {
    // 剖面选中态
    if (mesh?.object?.name?.includes("起点坐标") || mesh?.object?.name?.includes("终点坐标")) {
      onPlaneActiveToggle(mesh);
      return;
    }
    // 剖面标注
    onDrewPlane(event);
  } else if (tabToolName.value === "标管孔") {
    // 管孔的选中态 不绘制，所以直接return
    if (mesh?.object?.name?.includes("管孔")) {
      onHoleActiveToggle(mesh);
      return;
    }
    // 圆形管孔标注
    onDrewHole(event);
  } else if (tabToolName.value === "测距") {
    if (mesh?.object?.name?.includes("终点坐标")) {
      onDeleteRanging(mesh);
      return;
    }
    // 测距
    onDrewRanging(event);
  }

  // 最后记得重新渲染 canvas 画布
  css2RendererStyle(twin);
};

// 关闭剖面属性弹框
const onClosePlaneAttr = () => {
  let startPoint, endPoint;

  planeAttrShow.value = false;
  const _pageNum = selectPlane.value?.name?.slice(9, 10);

  twin.scene.traverse((obj) => {
    if (obj.name.includes(`剖面序号${_pageNum}-起点坐标`)) {
      startPoint = obj.position;
    } else if (obj.name.includes(`剖面序号${_pageNum}-终点坐标`)) {
      endPoint = obj.position;
    }
  });

  if (startPoint && endPoint) {
    const mesh = createDirectionNorth(startPoint, endPoint, _pageNum);
    planeGroup.add(mesh);
    twin.scene.add(planeGroup);
  }
};

const onCloseHoleAttr = (data: { rotate: number }) => {
  holeAttrShow.value = false;
  const name = selectHole.value?.name?.split("-")[1];
  // 角度转弧度
  const radRotate = (data.rotate / 180) * Math.PI;
  selectHole.value.rotation.y += radRotate;

  // 通过递归遍历 找到 selectHole 中间的电缆，也旋转同样的角度
  twin.scene.traverse((obj) => {
    if (obj?.name?.includes(name) && obj?.userData?.name === "电缆") {
      obj.rotation.y += radRotate;
    }
  });
};

const onMouseMove = (event: MouseEvent) => {
  event.preventDefault();
  const point = rayCasterPoint(event);
  if (!point) return;

  if (p1 && point) {
    sphereEnd = drawSphere(point, "终点坐标");

    planeGroup.add(sphereEnd);
    sphereEndDragList.push(sphereEnd);
  }
};

twin.renderer?.domElement.addEventListener("click", onClick);
twin.renderer?.domElement.addEventListener("mousemove", onMouseMove);

onMounted(() => {
  if (twin.renderer?.domElement) {
    webgl.value?.appendChild(twin.renderer?.domElement);
    webgl.value?.appendChild(twin.css2Renderer.domElement);
  }
});

// 销毁全局变量，防止内存泄漏
const destroyGlobalVariable = () => {
  clickNum = 0;
  p1 = null;
  p2 = null;
  // pageNum = null;
  sphereEndDragList = null;
  // holeDragList = null;
  sphereStart = null;
  sphereEnd = null;
  // rangingNum = null;
  rangingClickNum = 0;
  rangingP1 = undefined;
  rangingP2 = undefined;

  rangingSphereStart = null;
  rangingSphereEnd = null;
};

onUnmounted(() => {
  destroyGlobalVariable();
  twin.renderer?.domElement.removeEventListener("click", onClick);
  twin.renderer?.domElement.removeEventListener("mousemove", onMouseMove);
});

// 创建辅助坐标轴
const axesHelper = new THREE.AxesHelper(80);
axesHelper.translateY(0.4);
twin.scene.add(axesHelper);
</script>

<style scoped lang="scss">
/* 禁用移动端长按复制 */
* {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.footer {
  position: fixed;
  bottom: 10px;
  height: 40px;
}
</style>
