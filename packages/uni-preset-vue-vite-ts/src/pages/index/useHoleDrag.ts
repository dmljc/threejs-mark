import { ref } from "vue";
import * as THREE from 'three';
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

    twin.scene.children.forEach((item: any) => {
      if (item.isMesh || item.isCSS2DObject) {
        if (item.name === `${holeName}-电缆`) {
          cable = item;
        } else if (item.name === `${holeName}-尺寸`) {
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
  const onHandle = (e: any) => {
    getCurrentHoleCable(e.object.name);

    // 对拖拽的管孔列表遍历获取最新的坐标数据
    // const result = holeDragList.map((item: { uuid: string }) => {
    //     if (item.uuid === e.object.uuid) {
    //         return e.object;
    //     } else {
    //         return item;
    //     }
    // });

    // holeDragedList.value = result;
  };

  // 拖拽中
  dragControls.addEventListener("drag", (e) => {
    twin.controls.enabled = false;
    onHandle(e);

    const { cable, size } = getCurrentHoleCable(e.object.name);
    cable.visible = false; // 电缆
    size.visible = false; // 管孔尺寸
  });

  // 拖拽结束
  dragControls.addEventListener("dragend", (e) => {
    twin.controls.enabled = true;
    const {name, position } = e.object;
    const { cable, size } = getCurrentHoleCable(name);
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
