import { onUnmounted } from "vue";
import * as THREE from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";

interface Props {
  twin: any;
  holeDragList: any;
  selectHole: any;
  hole: number;
}

const useHoleDrag = (props: Props) => {
  const { twin, holeDragList, hole, selectHole } = props;

  let dragControls: DragControls | null = new DragControls(
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

  // 管孔选中态切换(仅点击管孔的时候允许切换颜色)
  const onHoleActiveToggle = (
    mesh:
      | THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>
      | THREE.Mesh<
          THREE.TorusGeometry,
          THREE.MeshBasicMaterial,
          THREE.Object3DEventMap
        >
  ) => {
    selectHole.value = mesh.object || mesh;
    const moName = (mesh.object || mesh)?.name.split("-")[1];

    twin.scene.children.forEach((item: any) => {
      // 排除 平行光、环境光、坐标轴和scanner模型
      const dLight = item.isDirectionalLight;
      const aLight = item.isAmbientLight;
      const lSegment = item.isLineSegments;
      const name = item.name;

      if (dLight || aLight || lSegment || name === "Node") return;

      if (item.userData.name === "管孔" && item.name.split("-")[1] === moName) {
        // 当前管孔设置为选中色
        item.material?.color.set(0x00ffff);
      } else if (item.userData.name === "管孔") {
        // 其他管孔颜色设置为默认色
        item.material?.color.set(0xffff00);
      }
    });
  };

  dragControls.addEventListener("dragstart", (e) => {
    twin.controls.enabled = false;
    selectHole.value = e.object;
    onHoleActiveToggle(e);
  });

  // 拖拽中
  dragControls.addEventListener("drag", (e) => {
    twin.controls.enabled = false;
    const { name } = e.object;

    // 拖拽的过程中把电缆和管孔尺寸隐藏
    const { cable, size } = getCurrentHoleCable(name);
    if (!cable || !size) return;
    cable.visible = false; // 电缆
    size.visible = false; // 管孔尺寸
  });

  // 拖拽结束
  dragControls.addEventListener("dragend", (e) => {
    twin.controls.enabled = true;
    const { name, position } = e.object;

    // 拖拽的结束后把电缆和管孔尺寸显示
    const { cable, size } = getCurrentHoleCable(name);
    if (!cable || !size) return;
    cable.visible = true;
    cable.position.copy(position);
    size.visible = true;
    size.position.copy(position);
    size.position.y += hole / 1300;
  });

  onUnmounted(() => {
    dragControls?.deactivate();
    dragControls?.dispose();
    dragControls = null;
  });

  return {
    // holeDragControls: dragControls
  };
};

export default useHoleDrag;
