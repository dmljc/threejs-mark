import * as THREE from "three";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import { drewRect, createSphere } from "../../../twin";

const usePlaneDrag = (props: any) => {
  const { twin, sphereEndDragList, planeParamsList } = props;

  const groupDrag = new THREE.Group();

  const dragControls = new DragControls(
    sphereEndDragList,
    twin.camera,
    twin.renderer.domElement
  );

  const onHandle = (e: { object: THREE.Object3D; } & THREE.Event<"drag", DragControls>) => {
    const params = planeParamsList?.filter((el: any) => {
      if (el.pageNum === parseInt(e.object.name.slice(9, 10))) {
        return el;
      }
    })[0];

    let { p1, pageNum } = params ?? {};

    const endPoint = e.object.position;

    // 绘制剖面标注
    const {
      rect: _rect,
      sizeAC: _sizeAC,
      sizeDB: _sizeDB,
      sizeAD: _sizeAD,
      sizeCB: _sizeCB,
    } = drewRect(p1, endPoint, pageNum);

    // 起点坐标
    const sphereStart = createSphere(p1, twin.camera);
    const sName = "起点坐标";
    const type = "剖面";
    const eventType = "drag";
    const orderName = '剖面序号';
    sphereStart.name = `${eventType}-${orderName}${pageNum}-${sName}`;
    sphereStart.userData = {
      pageNum,
      name: sName,
      eventType,
      type,
    };

    // 终点坐标
    const sphereEnd = createSphere(endPoint, twin.camera);
    const eName = "终点坐标";
    sphereEnd.name = `${eventType}-${orderName}${pageNum}-${eName}`;
    sphereEnd.userData = {
      pageNum,
      name: eName,
      eventType,
      type,
    };
    sphereEnd.name = `${eventType}-${orderName}${pageNum}-${eName}`;

    groupDrag.add(
      _rect,
      _sizeAC,
      _sizeDB,
      _sizeAD,
      _sizeCB,
      sphereStart,
      sphereEnd
    );

    groupDrag.name = '剖面组';
    groupDrag.userData = {
      pageNum,
      eventType,
    };
    twin.scene.add(groupDrag);

    // 移除实时创建的网格模型
    twin.scene.traverse((item: any) => {
      if (!item.isGroup) return;
      if (item.isGroup && !item.name) {
        twin.scene.remove(item);
      }
      const groupedByName: any = {};
      // 把拖拽的同一个剖面标注的数据放在同一个数组
      item.children.forEach((el: any) => {
        const sName = el.name.slice(0, 10);
        if (!groupedByName[sName]) {
          groupedByName[sName] = [];
        }
        groupedByName[sName].push(el);
      });

      // 从同一个数组中取出最后一次拖拽的剖面标注数据
      for (const key in groupedByName) {
        if (Object.prototype.hasOwnProperty.call(groupedByName, key)) {
          const record = groupedByName[key];
          const startRecord = record.slice(0, record.length - 7);
          const endRecord = record.slice(record.length - 7, record.length);
          item.remove(...startRecord);
          groupDrag.add(...endRecord);
        }
      }
    });
  };

  // 拖拽中
  dragControls.addEventListener("drag", (e) => {
    twin.controls.enabled = false;
    onHandle(e);
  });

  // 拖拽结束
  dragControls.addEventListener("dragend", () => {
    twin.controls.enabled = true;
  });

  return {};
};

export default usePlaneDrag;
