import { ref } from "vue";
import * as THREE from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";

interface Props {
  twin: any;
  holeDragList: any;
  holeNum: number;
  hole: number;
}

const useHoleDrag = (props: Props) => {
  const { twin, holeDragList, holeNum, hole } = props;

  const holeDragedList = ref([]); // 拖拽后更新坐标数据之后的管孔列表

  const dragControls = new DragControls(
    holeDragList,
    twin.camera,
    twin.renderer.domElement
  );

  // 当前管孔内的电缆和管孔尺寸
  const getCurrentHoleCable = (holeName: string) => {
    let cable: THREE.Mesh;
    let size: THREE.Mesh;

    // holeName '圆形管孔-直径175:1724050026681-管孔'
    const _holeName = holeName.split("-")[1]; // '直径175:1724050026681'

    twin.scene.children.forEach((item: any) => {
      if (
        (item.isMesh || item.isCSS2DObject) &&
        item.name.split("-")[1] === _holeName
      ) {
        if (item.userData.name === "电缆") {
          cable = item;
        } else if (item.userData.name === "尺寸") {
          size = item;
        }
      }
    });

    return {
      cable,
      size,
    };
  };

  // 显示管孔尺寸
  // const onHandle = (e: any) => {
  //   getCurrentHoleCable(e.object.name);

  //   // 对拖拽的管孔列表遍历获取最新的坐标数据
  //   // const result = holeDragList.map((item: { uuid: string }) => {
  //   //     if (item.uuid === e.object.uuid) {
  //   //         return e.object;
  //   //     } else {
  //   //         return item;
  //   //     }
  //   // });

  //   // holeDragedList.value = result;
  // };

  // 拖拽中
  dragControls.addEventListener("drag", (e) => {
    twin.controls.enabled = false;
    const { name, material } = e.object;
    material.color.set(0x00ffff);
    // 拖拽的过程中把电缆和管孔尺寸隐藏
    const { cable, size } = getCurrentHoleCable(name);
    if (!cable || !size) return;
    cable.visible = false; // 电缆
    size.visible = false; // 管孔尺寸
  });

  // 拖拽结束
  dragControls.addEventListener("dragend", (e) => {
    twin.controls.enabled = true;
    const { name, position, material } = e.object;
    material.color.set(0xffff00);

    // 拖拽的结束后把电缆和管孔尺寸显示
    const { cable, size } = getCurrentHoleCable(name);
    if (!cable || !size) return;
    cable.visible = true;
    cable.position.copy(position);
    size.visible = true;
    size.position.copy(position);
    size.position.y += hole / 1300;
  });

  return {
    holeDragedList,
  };
};

export default useHoleDrag;
