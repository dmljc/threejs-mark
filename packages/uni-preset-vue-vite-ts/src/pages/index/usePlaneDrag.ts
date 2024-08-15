/* eslint-disable prefer-const */
import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { drewRect, createSphere } from'../../../twin';

const usePlaneDrag = (props: any) => {
    const { twin, sphereEndDragList, planeParamsList } = props;

    // let isHoverOn: boolean = false; // 是否处于hover 状态
    // let hoverPlane: THREE.Object3D<THREE.Object3DEventMap>; // 当前处于hover 状态的剖面

    const groupDrag = new THREE.Group();
    const dragControls = new DragControls(sphereEndDragList, twin.camera, twin.renderer.domElement);

    // 创建右键菜单的DOM结构
    const rightMenu = document.createElement('div');
    rightMenu.style.position = 'absolute';
    rightMenu.style.display = 'none';
    rightMenu.innerHTML = `<button id='planedel'>删除剖面</button>`;
    document.body.appendChild(rightMenu);

    // 监听鼠标右键事件
    // const onContextMenu = (event: any) => {
    //     if (!planeList.length) return;
    //     // 将菜单显示在鼠标位置
    //     rightMenu.style.top = event.clientY + 'px';
    //     rightMenu.style.left = event.clientX + 'px';
    //     rightMenu.style.display = 'block';
    // };

    const onHandle = (e: any) => {
        const params = planeParamsList?.filter((el: any) => {
            if (el.pageNum === parseInt(e.object.name.slice(9, 10))) {
                return el;
            }
        })[0];

        let { p1, pageNum, sphereStart, sphereEnd } = params ?? {};

        if (!p1) return;

        const endPoint = e.object.position;

        const dragGroup = twin.scene.children.find((item: { name: string }) =>
            item.name.startsWith('drag')
        );

        // 修改dblclick 开头的剖面组名称
        if (dragGroup) {
            twin.scene.children.forEach((el: { name: string }) => {
                const _pageNum = dragGroup.name.slice(-1);
                if (el.name.startsWith('dblclick')) {
                    el.name = el.name.slice(0, -1) + _pageNum;
                }
            });
        }
        // 移除 children 为空的 group 对象。不放在twin.scene.traverse中移除是因为threejs不允许修改。
        twin.scene.children.forEach((item: { isGroup: any; children: string | any[] }) => {
            if (item.isGroup && !item.children.length) {
                twin.scene.remove(item);
            }
        });
        // 移除实时创建的网格模型
        twin.scene.traverse((item: any) => {
            if (!item.isGroup) return;
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
                    const startRecord = record.slice(0, record.length - 8);

                    const endRecord = record.slice(record.length - 8, record.length);
                    item.remove(...startRecord);
                    groupDrag.add(...endRecord);
                }
            }
        });

        // 绘制剖面标注
        const {
            length,
            width,
            depth,
            rect: _rect,
            sizeAC: _sizeAC,
            sizeDB: _sizeDB,
            sizeAD: _sizeAD,
            sizeCB: _sizeCB,
            cube,
            // pageNumber: _pageNumber
        } = drewRect(p1, endPoint, pageNum);

        sphereStart = createSphere(p1, twin.camera);
        sphereStart.name = `drag-剖面序号${pageNum}-起点坐标`;
        sphereEnd = createSphere(endPoint, twin.camera);
        sphereEnd.name = `drag-剖面序号${pageNum}-终点坐标`;

        groupDrag.add(
            _rect,
            _sizeAC,
            _sizeDB,
            _sizeAD,
            _sizeCB,
            // _pageNumber,
            cube,
            sphereStart,
            sphereEnd
        );
        sphereEndDragList.push(sphereEnd);
        const eventType = 'drag';
        groupDrag.name = `${eventType}-剖面组${pageNum}`;
        groupDrag.userData = {
            pageNum,
            eventType
        };
        twin.scene.add(groupDrag);

        planeParamsList.forEach(
            (ele: { p2: any; width: number; pageNum: number; length: number; depth: number }) => {
                if (pageNum === ele.pageNum) {
                    ele.length = length;
                    ele.depth = depth;
                    ele.width = width;
                    ele.p2 = endPoint;
                }
            }
        );
    };

    // 拖拽中
    dragControls.addEventListener('drag', (e) => {
        twin.controls.enabled = false;
        onHandle(e);
    });

    // 拖拽结束
    dragControls.addEventListener('dragend', () => {
        twin.controls.enabled = true;
    });

    // dragControls.addEventListener('hoveron', (e) => {
    //     hoverPlane = e.object;
    //     isHoverOn = false;
    // });

    // twin.renderer.domElement.addEventListener('contextmenu', (event: any) => {
    //     isHoverOn && onContextMenu(event);
    // });

    // 删除剖面
    // document.getElementById('planedel')?.addEventListener('click', (e) => {
    //     console.log(
    //         'start----planeGroup.children:',
    //         planeGroup.children.length,
    //         planeGroup.children
    //     );
    //     const _pageNum = hoverPlane?.name.slice(9, 10);
    //     const index = planeGroup.children.findIndex((item: { name: string | string[] }) => {
    //         if (item.name.includes(`drag-剖面序号${_pageNum}`)) {
    //             return item;
    //         }
    //     });

    //     if (index === -1) {
    //         return console.log('没有找到对应的元素');
    //     }
    //     planeGroup.children.splice(index, 8);
    //     rightMenu.style.display = 'none';
    //     console.log('end----planeGroup.children:', planeGroup.children.length, planeGroup.children);
    // });

    // dragControls.addEventListener('hoveroff', () => {
    //     isHoverOn = false;
    //     rightMenu.style.display = 'none';
    // });

    return {};
};

export default usePlaneDrag;
