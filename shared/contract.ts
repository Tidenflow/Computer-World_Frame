// shared/contract.ts

//用户信息接口
export interface User {
    id : number;         //用户id
    username : string;  //用户名称
    timeStamp : number;   //账户创建时间
}

//知识节点接口
export interface CWFrameNode {
    id : number;                //节点id
    label : string;             //节点标签/标题
    description : string;       //节点描述    
    dependencies : number[];    //依赖节点 ===> 理解为图中的边  
    // 比如A.dependencies = [B, C] 表示 A 依赖 B 和 C。就是B -> A、C -> A
}

//知识框架图接口
export interface CWFrameMap {
    version : string | number;  //框架版本
    nodes : CWFrameNode[];      //节点数组    nodes 是图里的顶点集合。
}

//用户进度接口
export interface CWFrameProgress {
    userId : number;
    unlockedNodes: Record<number, { unlockedAt: number }>; // 点亮记录
}

// 建议补充：统一响应格式
export interface ApiResponse<T> {
    success: boolean;   // 业务是否成功
    data: T | null;      // 实际数据
    message?: string;    // 错误消息
}

// 补充：统一响应格式
export interface ApiResponse<T> {        //===>使用泛型占位 
    success: boolean;   // 业务是否成功
    data: T | null;      // 实际数据     定义逻辑，延迟定义数据
    message?: string;    // 错误消息
}