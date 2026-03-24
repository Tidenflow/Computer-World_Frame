//  core/cwframe.status.ts
//   根据一个节点和Progress的状态判断这个节点的状态

//下面这几个仅仅作为类型导入需要写import type
import type { CWFrameNode,CWFrameMap,CWFrameProgress } from "@shared/contract";

//由于后端只负责持久化数据，后端仅保留CWFrameProgress即可
export type CWFrameNodeStatus = 'Locked' | 'Discoverable' | 'Unlocked' ;

// 判断节点状态函数，提供给Map进行渲染逻辑方便判断
function getNodeStatus(node : CWFrameNode, progress : CWFrameProgress) : CWFrameNodeStatus {
    const nodeId = node.id;
    const unlockedNodes = progress.unlockedNodes;

    // 1.判断当前节点是否已解锁
    if(nodeId in unlockedNodes) return 'Unlocked';

    // 2.初始状态：没有任何解锁时，所有节点都是 Locked   这个是因为bug:根节点永远都是Disconvered
    const hasAnyProgress = Object.keys(unlockedNodes).length > 0;   //检查：用户有没有点亮过任何节点？
    if (!hasAnyProgress) return 'Locked';

    // 3.有进度时：检查依赖是否全部满足
    const allDependenciesUnlocked = node.dependencies.every(depId => depId in unlockedNodes);
    if(allDependenciesUnlocked) return 'Discoverable';

    return 'Locked';
}

// 我们现在需要将节点状态和Map联系起来  Record<number,CWFrameNodeStatus>这是描述对象的数据结构
function buildStatusMap(map : CWFrameMap, progress : CWFrameProgress) : Record<number,CWFrameNodeStatus>{

//         Object.fromEntries([
//          ['name', '小明'],
//          ['age', 18]
//          ])
//   变成   { name: '小明', age: 18 }

    return Object.fromEntries(
        map.nodes.map(node => [node.id,getNodeStatus(node,progress)])    //  => 返回[[1, 'Unlocked'], [2, 'Locked']]
        // .map   把数组里的每一个东西，挨个处理一遍，返回一个新数组
        // [1,2,3].map(num => num * 2)
    );
}


//导出工具函数
export {
    getNodeStatus,
    buildStatusMap
}


























