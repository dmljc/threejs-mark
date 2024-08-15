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
    <wd-button hairline @click="onPlaneAttrShow">剖面属性</wd-button>
  </wd-row>

  <!-- 剖面属性弹框 -->
  <plane-attr-modal :show="planeAttrShow" @close="onClosePlaneAttr" />

  <!-- 需要在页面中引入该组件wd-toast，作为挂载点。 -->
  <wd-toast />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watchEffect } from "vue";
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
  box3IsContainsBox,
  box3IsContainsPoint,
  removePlanes,
  rangingFn,
  createDirectionNorth,
} from "../../../twin";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { cloneDeep } from 'lodash-es';
import { useToast } from "wot-design-uni";
import UsePlaneDrag from "./usePlaneDrag.js";
import PlaneAttrModal from "./PlaneAttrModal.vue";

const toast = useToast();

const tabTools = ["标剖面", "标管孔", "测距", "删除", "立视图"];
const tabToolName = ref<string>("标剖面");

const tabViews = ["主视图", "左视图", "俯视图", "重置"];
const tabViewName = ref<string>("重置");
const webgl = ref<HTMLDivElement | null>(null);
const twin = new CreateTwin();
const loader = new GLTFLoader();

let clickNum: number = 0; // 记录点击次数
let p1: THREE.Vector3 | null = null; // 起点坐标
let p2: THREE.Vector3 | null = null; // 终点坐标
let pageNum: number = 1; // 剖面的序号,先作废用planeNum字段
const planeNum = ref<number>(0);

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
const isActived = ref<boolean>(false); // 剖面是否处于选中态

// 管孔属性
const hole = ref<number>(175); // 管孔直径尺寸
let holeNum: number; // 管孔序号为了保证唯一使用时间戳
let holeDragList = []; // 圆形管孔列表
const holeGroup = new THREE.Group(); // 圆形管孔组

UsePlaneDrag({ twin, sphereEndDragList, planeParamsList });

const onTabToolsChange = (item: { name: string; index: number }) => {
  tabToolName.value = item.name;
  if (item.name === "删除") {
    isDeletePlane.value = !isDeletePlane.value;
  }
};

// 视图快捷键
const onTabViewsChange = (item: { name: string; index: number }) => {
  if (item.name === "主视图") {
    twin.camera.position.set(2, 0, 0);
  } else if (item.name === "左视图") {
    twin.camera.position.set(0, 0, 2);
  } else if (item.name === "俯视图") {
    twin.camera.position.set(0, 3.4, 0);
  } else if (item.name === "重置") {
    twin.camera.position.set(2, 2, 2);
  }
  twin.camera.lookAt(0, 0, 0);
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
    // message.warn('请点击模型非空区域');
    toast.warning("请点击模型非空区域");
    return null;
  }
};

// 画小圆点
const drawSphere = (point: THREE.Vector3, type: string) => {
  if (!point) {
    // message.warn('请点击模型非空区域xx');
    toast.warning("请点击模型非空区域xx");
    return null;
  }
  const sphere = createSphere(point, twin.camera);
  const eventType = "drag";
  sphere.name = `${eventType}-剖面序号${pageNum}-${type}`;
  sphere.userData = {
    pageNum,
    name,
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
    const eventType = "dblclick";
    const type = "剖面组";
    planeGroup.name = `${eventType}-${type}${pageNum}`;
    planeGroup.userData = {
      type,
      pageNum,
      eventType,
    };
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
        cube,
      } = drewRect(p1, point, pageNum);
      sphereEnd = drawSphere(point, "终点坐标");
      planeGroup.add(
        sizeAC,
        sizeDB,
        sizeAD,
        sizeCB,
        rect,
        sphereStart,
        sphereEnd,
        cube
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

// 绘制管孔
const onDrewHole = (event: MouseEvent) => {
  holeNum = +new Date();
  const point = rayCasterPoint(event);
  if (!point) return;
  const ellipse = drewCircleHole(point, hole.value, holeNum);
  holeGroup.add(ellipse);
  twin.scene.add(holeGroup);
  
  holeDragList.push(ellipse);
  const holeParams = {
    hole: hole.value,
    point,
    mesh: ellipse,
  };

  holeParamsList.push(cloneDeep(holeParams)); // 深拷贝之后就不能修改管孔颜色了

  console.log('twin.scene', twin.scene.children);
};

// 删除
const onDelete = (
  mesh: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>
) => {
  const currentName = mesh.object.name?.split("-")?.[1];

  twin.scene.children.forEach((item) => {
    let list: THREE.Object3D<THREE.Object3DEventMap>[] = [];
    item?.children?.forEach((el) => {
      if (el.name?.includes(currentName)) {
        list.push(el);
      }
    });
    // 把属于同一个剖面的点，线，尺寸都放在同一个数组，方便从场景中移除
    item.remove(...list);
  });
};

// 剖面的选中态切换
const onPlaneActiveToggle = (mesh: any) => {
  // 当前选中的剖面序号，如：剖面序号1
  const currentPlaneName = mesh.object.name.slice(5, 10);
  // 递归处理剖面的选中态
  twin.scene.children?.forEach((item: any) => {
    if (!item.isGroup) return;
    item.children?.forEach((ele: any) => {
      isActived.value = !isActived.value;
      // 当前剖面的选中状态
      if (ele.name.slice(5, 10) === currentPlaneName) {
        // 把选中的当前剖面的线变为蓝色
        if (["线"].includes(ele.userData.type)) {
          ele.material?.color.set(0x0000ff);
          // 把选中的当前剖面的'选中块'变为蓝色
        } else if (["选中"].includes(ele.userData.type)) {
          ele.material?.color.set(0x0000ff);
        }
      } else {
        // 其他剖面的选中状态
        if (["线"].includes(ele.userData.type)) {
          ele.material?.color.set(0xffff00);
        } else if (["选中"].includes(ele.userData.type)) {
          ele.material?.color.set(0xffff00);
        } else if (["方向"].includes(ele.userData.type)) {
          planeGroup.remove(ele);
        }
      }
    });
  });
};

const onClick = (event: MouseEvent) => {
  const { mesh } = getRayCasterPoint(event, twin);
  selectPlane.value = mesh?.object;

  // 若点击了右上角选中块儿则表示当前剖面处于选中状态
  if (mesh?.object?.name?.includes("选中")) {
    onPlaneActiveToggle(mesh);
    return;
  }

  if (tabToolName.value === "标剖面") {
    // 剖面标注
    onDrewPlane(event);
  } else if (tabToolName.value === "标管孔") {
    // 圆形管孔标注
    onDrewHole(event);
  } else if (tabToolName.value === "测距") {
    // 测距
    // onDrewRanging(event);
  } else if (tabToolName.value === "删除") {
    onDelete(mesh);
  }

  // 最后记得重新渲染 canvas 画布
  css2RendererStyle(twin);
};

// 关闭剖面属性弹框
const onClosePlaneAttr = (data) => {
  planeAttrShow.value = false;

  const _pageNum = selectPlane.value?.name?.slice(9, 10);

  let startPoint, endPoint;

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

const onMouseMove = (event: MouseEvent) => {
  event.preventDefault();
  const { point } = getRayCasterPoint(event, twin);

  // 移除实时创建的网格模型
  removePlanes(twin);
  if (p1 && point) {
    sphereEnd = drawSphere(point, "终点坐标");
    const { rect, sizeAC, sizeDB, sizeAD, sizeCB, cube } = drewRect(
      p1,
      point,
      pageNum
    );

    planeGroup.add(
      sizeAC,
      sizeDB,
      sizeAD,
      sizeCB,
      rect,
      sphereStart,
      sphereEnd,
      cube
    );
    planeGroup.name = "剖面组";
    twin.scene.add(planeGroup);
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
  // rangingClickNum = 0;
  // rangingP1 = null;
  // rangingP2 = null;
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
