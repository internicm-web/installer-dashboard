import { useState, useEffect, useMemo } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbyItAZg3jvynbm0Mooz_MR4ynanrc3_t_OXxea2qPiW_57ODklF-X1B9PzonAR9u4TUgg/exec";

const CAT_COLORS = ["blue","blue","blue","cyan","cyan","cyan","purple","purple","purple","amber","gray","amber","amber","amber","gray"];
const COLOR = {
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
  cyan:   "bg-cyan-50 text-cyan-700 border-cyan-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  gray:   "bg-gray-100 text-gray-600 border-gray-200",
};

function sevClass(n) {
  if (n>=10) return "bg-red-100 text-red-800 border-red-300";
  if (n>=8)  return "bg-orange-100 text-orange-800 border-orange-300";
  if (n>=6)  return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-green-100 text-green-800 border-green-300";
}

function buildData(rows) {
  if (!rows||rows.length<4) return {updateDate:"",categories:[],provinces:[]};
  const updateDate=(rows[0][0]||"").replace("ข้อมูล Update วันที่ ","").trim();
  const categories=[];
  for (let c=3;c<rows[0].length;c+=2) {
    const raw=(rows[0][c]||"").toString().trim();
    categories.push(raw||(categories[categories.length-1]||""));
  }
  const dm={};
  for (let r=3;r<rows.length;r++) {
    const row=rows[r];
    const province=(row[0]||"").toString().trim();
    const district=(row[1]||"").toString().trim();
    const region=(row[2]||"").toString().trim();
    if (!province||!district) continue;
    const counts=[];
    for (let c=3;c+1<row.length;c+=2) {
      const cnt=parseInt(row[c]||"0",10)||0;
      const raw=(row[c+1]||"").toString().trim();
      const names=raw?raw.split("\n").map(s=>s.replace(/^\d+\./,"").trim()).filter(Boolean):[];
      counts.push({count:cnt,names});
    }
    while(counts.length<categories.length) counts.push({count:0,names:[]});
    if (!dm[province]) dm[province]={region,districts:[]};
    dm[province].districts.push({district,counts});
  }
  const provinces=Object.entries(dm).map(([province,{region,districts}])=>{
    const missing=categories.map((_,ci)=>districts.every(d=>(d.counts[ci]?.count??0)===0));
    const catStats=categories.map((cat,ci)=>{
      const covered=districts.filter(d=>(d.counts[ci]?.count??0)>0).length;
      const total=districts.length;
      const maxCount=Math.max(...districts.map(d=>d.counts[ci]?.count??0));
      return {cat,covered,total,missing:total-covered,maxCount};
    });
    return {province,region,districts,missing,catStats,missingCount:missing.filter(Boolean).length};
  });
  provinces.sort((a,b)=>b.missingCount-a.missingCount);
  return {updateDate,categories,provinces};
}

function ProvincePanel({prov,categories}) {
  const [view,setView]=useState("summary");
  const [ds,setDs]=useState("");
  const filtered=useMemo(()=>prov.districts.filter(d=>d.district.includes(ds)),[ds,prov.districts]);

  return (
    <div className="bg-slate-50 border-t border-slate-200 px-4 py-4 sm:px-6">
      <div className="flex gap-2 mb-4">
        {[["summary","📊 สรุปรายประเภท"],["detail","📍 รายละเอียดอำเภอ"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${view===v?"bg-indigo-600 text-white border-indigo-600":"bg-white text-slate-600 border-slate-300 hover:border-indigo-400"}`}>
            {l}
          </button>
        ))}
      </div>
      {view==="summary" && (
        <div>
          <p className="text-xs text-slate-400 mb-3">ครอบคลุมจาก {prov.districts.length} อำเภอทั้งหมด</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {prov.catStats.map((cs,ci)=>{
              const pct=Math.round((cs.covered/cs.total)*100);
              const barColor=cs.covered===cs.total?"bg-green-500":cs.covered===0?"bg-red-400":"bg-yellow-400";
              const badgeColor=cs.missing===0?"bg-green-100 text-green-700":cs.missing===cs.total?"bg-red-100 text-red-700":"bg-yellow-100 text-yellow-700";
              return (
                <div key={ci} className="bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1.5 gap-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${COLOR[CAT_COLORS[ci]||"gray"]}`}>{cs.cat}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{cs.covered}/{cs.total}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                    <div className={`h-1.5 rounded-full ${barColor}`} style={{width:`${pct}%`}}/>
                  </div>
                  <p className="text-xs text-slate-400">
                    {cs.missing===0?"✅ ครบทุกอำเภอ":cs.missing===cs.total?`❌ ขาดทุกอำเภอ`:`⚠️ ขาด ${cs.missing} อำเภอ`}
                    {cs.maxCount>0&&<span className="ml-1">· สูงสุด {cs.maxCount} คน</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {view==="detail" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
            <span className="font-bold text-slate-700 text-sm">{prov.province} — {prov.districts.length} อำเภอ</span>
            <input type="text" placeholder="🔍 ค้นหาอำเภอ..."
              className="sm:ml-auto w-full sm:w-48 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              value={ds} onChange={e=>setDs(e.target.value)}/>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filtered.map((d,di)=>{
              const missing=d.counts.map((c,ci)=>({ci,...c})).filter(c=>c.count===0);
              const has=d.counts.map((c,ci)=>({ci,...c})).filter(c=>c.count>0);
              return (
                <div key={di} className="bg-white rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm">{d.district}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sevClass(missing.length)}`}>
                      ขาด {missing.length} ประเภท
                    </span>
                  </div>
                  {has.length>0&&(
                    <div className="mb-2">
                      <p className="text-xs text-slate-400 mb-1">✅ มีช่าง:</p>
                      <div className="flex flex-wrap gap-1">
                        {has.map(({ci,count,names})=>(
                          <span key={ci} title={names.join(", ")}
                            className={`text-xs px-2 py-0.5 rounded border cursor-default ${COLOR[CAT_COLORS[ci]||"gray"]}`}>
                            {categories[ci]} <b>({count} คน)</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {missing.length>0&&(
                    <div>
                      <p className="text-xs text-slate-400 mb-1">❌ ไม่มีช่าง:</p>
                      <div className="flex flex-wrap gap-1">
                        {missing.map(({ci})=>(
                          <span key={ci} className="text-xs px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
                            {categories[ci]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {missing.length===0&&<p className="text-green-600 text-xs font-bold">✅ มีช่างครบทุกบริการ</p>}
                </div>
              );
            })}
            {filtered.length===0&&<p className="text-center text-slate-400 py-4 text-sm">ไม่พบอำเภอที่ค้นหา</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [raw,setRaw]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [search,setSearch]=useState("");
  const [region,setRegion]=useState("All");
  const [expanded,setExpanded]=useState(()=>new Set());

  useEffect(()=>{
    const cbName="gsCallback_"+Date.now();
    const script=document.createElement("script");
    const timer=setTimeout(()=>{
      setError("หมดเวลา — ตรวจสอบ Apps Script");
      setLoading(false);
      delete window[cbName];
    },10000);
    window[cbName]=(data)=>{
      clearTimeout(timer);
      setRaw(data);
      setLoading(false);
      delete window[cbName];
      if(document.body.contains(script)) document.body.removeChild(script);
    };
    script.src=`${API_URL}?callback=${cbName}`;
    script.onerror=()=>{
      clearTimeout(timer);
      setError("โหลดไม่สำเร็จ");
      setLoading(false);
      delete window[cbName];
    };
    document.body.appendChild(script);
    return()=>{clearTimeout(timer);delete window[cbName];};
  },[]);

  const {updateDate,categories,provinces}=useMemo(()=>raw?buildData(raw):{updateDate:"",categories:[],provinces:[]},[raw]);
  const regions=useMemo(()=>["All",...Array.from(new Set(provinces.map(p=>p.region))).sort()],[provinces]);
  const filtered=useMemo(()=>provinces.filter(p=>p.province.includes(search)&&(region==="All"||p.region===region)),[provinces,search,region]);
  const summary=useMemo(()=>({
    critical:provinces.filter(p=>p.missingCount>=10).length,
    high:provinces.filter(p=>p.missingCount>=8&&p.missingCount<10).length,
    watch:provinces.filter(p=>p.missingCount>=6&&p.missingCount<8).length,
    ok:provinces.filter(p=>p.missingCount<6).length,
  }),[provinces]);
  const toggle=prov=>setExpanded(prev=>{const n=new Set(prev);n.has(prov)?n.delete(prov):n.add(prov);return n;});

  if(loading) return(
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
      <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
      <p className="text-slate-500 text-sm">กำลังโหลดข้อมูลจาก Google Sheets…</p>
    </div>
  );

  if(error) return(
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-sm">
        <p className="text-red-700 font-bold mb-2">โหลดข้อมูลไม่สำเร็จ</p>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    </div>
  );

  return(
    <div className="p-4 bg-gray-50 min-h-screen font-sans text-gray-800">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5 pb-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">🔧 แดชบอร์ดติดตามพื้นที่ขาดแคลนช่าง</h1>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
            <span>📅 อัปเดต: {updateDate}</span>
            <span>🗺️ {provinces.length} จังหวัด · {provinces.reduce((s,p)=>s+p.districts.length,0)} อำเภอ</span>
            <span className="text-green-600 font-bold">🔄 Live จาก Google Sheets</span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            {label:"🔴 วิกฤต",sub:"ขาด 10+ ประเภท",val:summary.critical,cls:"border-red-200 bg-red-50 text-red-700"},
            {label:"🟠 ขาดแคลนสูง",sub:"ขาด 8-9 ประเภท",val:summary.high,cls:"border-orange-200 bg-orange-50 text-orange-700"},
            {label:"🟡 เฝ้าระวัง",sub:"ขาด 6-7 ประเภท",val:summary.watch,cls:"border-yellow-200 bg-yellow-50 text-yellow-700"},
            {label:"🟢 พร้อม",sub:"ขาด < 6 ประเภท",val:summary.ok,cls:"border-green-200 bg-green-50 text-green-700"},
          ].map(c=>(
            <div key={c.label} className={`rounded-xl border p-4 shadow-sm ${c.cls}`}>
              <p className="font-bold text-sm">{c.label}</p>
              <p className="text-3xl font-extrabold mt-1">{c.val}<span className="text-sm font-medium ml-1">จังหวัด</span></p>
              <p className="text-xs opacity-60 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">🔍 ค้นหาจังหวัด</label>
            <input type="text" placeholder="พิมพ์ชื่อจังหวัด..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">📍 ภูมิภาค</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={region} onChange={e=>setRegion(e.target.value)}>
              {regions.map(r=><option key={r} value={r}>{r==="All"?"ทุกภูมิภาค":r}</option>)}
            </select>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="bg-indigo-50 px-4 py-2 text-xs text-indigo-700 border-b border-indigo-100">
            💡 คลิกที่แถวจังหวัดเพื่อดูรายละเอียดรายอำเภอ
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">จังหวัด</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase whitespace-nowrap">ประเภทบริการที่ไม่มีช่างเลย</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">บริการที่ขาด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row,idx)=>{
                  const isOpen=expanded.has(row.province);
                  const missingCats=row.missing.map((m,i)=>m?i:-1).filter(i=>i>=0);
                  return(
                    <>
                      <tr key={row.province} onClick={()=>toggle(row.province)}
                        className={`cursor-pointer transition-colors ${isOpen?"bg-indigo-50":idx%2===0?"bg-white hover:bg-indigo-50":"bg-gray-50 hover:bg-indigo-50"}`}>
                        <td className="px-4 py-3 sticky left-0 bg-inherit border-r border-gray-100">
                          <div className="flex items-start gap-2">
                            <span className={`text-gray-400 text-xs mt-1 inline-block transition-transform ${isOpen?"rotate-90":""}`}>▶</span>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{row.province}</p>
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{row.region}</span>
                                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{row.districts.length} อำเภอ</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${sevClass(row.missingCount)}`}>
                            {row.missingCount} ประเภทบริการ ที่ไม่มีช่างเลย
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {missingCats.length===0
                              ?<span className="text-green-600 font-bold text-xs">✅ ครบทุกบริการ</span>
                              :missingCats.map(ci=>(
                                <span key={ci} className={`text-xs px-2 py-0.5 rounded border ${COLOR[CAT_COLORS[ci]||"gray"]}`}>
                                  {categories[ci]}
                                </span>
                              ))
                            }
                          </div>
                        </td>
                      </tr>
                      {isOpen&&(
                        <tr key={row.province+"_p"}>
                          <td colSpan={3} className="p-0">
                            <ProvincePanel prov={row} categories={categories}/>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {filtered.length===0&&(
                  <tr><td colSpan={3} className="text-center py-10 text-gray-400 text-sm">ไม่พบข้อมูลที่ค้นหา</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-4 py-2 border-t text-right text-xs text-gray-400">
            แสดง {filtered.length} จาก {provinces.length} จังหวัด
          </div>
        </div>
      </div>
    </div>
  );
}
