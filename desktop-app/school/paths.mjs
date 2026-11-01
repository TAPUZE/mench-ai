import path from 'node:path';
import os from 'node:os';
import {existsSync} from 'node:fs';

export function schoolDataDirectory({explicit,env=process.env,platform=process.platform,home=os.homedir(),cwd=process.cwd()}={}){
    const chosen=explicit||env.MENCH_SCHOOL_DATA;if(chosen)return path.resolve(cwd,chosen);
    const profile=platform==='win32'?path.join(env.LOCALAPPDATA||path.join(home,'AppData','Local'),'MenchAI','school-service'):path.join(env.XDG_DATA_HOME||path.join(home,'.local','share'),'mench-ai','school-service');
    const hasData=directory=>['school.sqlite','restore-state.json','backups'].some(name=>existsSync(path.join(directory,name)));
    const legacy=path.resolve(cwd,'.local/school'),oldExists=hasData(legacy),profileExists=hasData(profile);
    if(oldExists&&profileExists&&path.resolve(legacy)!==path.resolve(profile))throw new Error('School databases exist in both the old development folder and application data. Set MENCH_SCHOOL_DATA to the intended location.');
    return oldExists?legacy:profile;
}
