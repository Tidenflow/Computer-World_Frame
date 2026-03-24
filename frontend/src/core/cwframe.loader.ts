//  core/cwframe.loader.ts
//  读取data下面的参数

import type {CWFrameMap,CWFrameProgress } from "@shared/contract";
import  {mockProgress} from "../data/mock-progress"
import frameMap from "../data/world-data.json"


// 读取mock-progress中的进度数据  读取为
export async function loadProgress() : Promise<CWFrameProgress> {
    // const progress = mockProgress;
    // return progress;
    return mockProgress;
}


// 读取world-data中的框架数据(json)
export async function loadFrameMap() : Promise<CWFrameMap> {
    // const map = frameMap;
    // return map;
    return frameMap;
}