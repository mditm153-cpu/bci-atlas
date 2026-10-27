
'use strict';
const BCI={local:['localhost','127.0.0.1'].includes(location.hostname)&&location.port==='8765',markets:['KOSPI','KOSDAQ'],factors:['C','A','N','S','L','I','M'],names:{C:'분기 실적',A:'연간 성장',N:'새로운 변화',S:'수요·거래량',L:'주도주·RS',I:'기관 참여',M:'시장 방향'},descs:{C:'지금 돈을 잘 벌고 있나? 최근 분기 EPS(주당순이익)가 작년 같은 분기보다 얼마나 늘었는지 봅니다. +18% 이상, +25% 이상을 참고하되 실제 통과 판정은 원본 확인이 필요합니다.',A:'매년 꾸준히 잘 벌었나? 최근 3년간 연간 EPS가 지속적으로 늘었는지 봅니다. 연평균 성장률과 매년 증가했는지는 따로 확인합니다.',N:'주가를 바꿀 새로운 변화가 있나? 신제품·신기술·경영진 변화·신고가를 살펴봅니다. 공시 제목은 후보일 뿐입니다.',S:'사려는 사람이 많아졌나? 주가가 상승할 때 거래량이 크게 늘고 매도 압력이 줄었는지 살펴봅니다.',L:'업종에서 가장 강한 주도주인가? 시장 대비 RS선과 동종업계 상대강도를 비교합니다.',I:'기관 같은 큰손이 사고 있나? 기관 순매수와 실제 보유 증가 여부를 구분해서 확인합니다.',M:'시장이 상승을 확인했나? 반등 시도·FTD·분산일로 전체 시장 흐름을 점검합니다.'}};
function el(id){return document.getElementById(id)}function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function fmt(v,d=1){return v==null||v===''||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d})}function pct(v){return v==null?'—':(v>0?'+':'')+fmt(v)+'%'}function dateFmt(v){let s=String(v||'').replace(/\D/g,'');return s.length===8?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6):escapeHtml(v||'—')}function krw(v){return v==null?'—':fmt(v/1e8,1)+'억원'}function badge(t,text){return '<span class="pill '+t+'">'+escapeHtml(text)+'</span>'}function marketCode(m){return m==='KOSDAQ'?'코스닥':'코스피'}
function nav(current){return '<nav class="nav" aria-label="CAN SLIM 화면"><a href="./index.html" class="'+(current==='home'?'active':'')+'">종합 메인</a>'+BCI.factors.map(f=>'<a href="./'+f.toLowerCase()+'.html" class="'+(current===f?'active':'')+'">'+f+' · '+BCI.names[f]+'</a>').join('')+'<a href="./rs_line.html" class="'+(current==='RS'?'active':'')+'">1년 RS선</a><a href="./matrix.html">전체 조건표</a><a href="./signals.html">RS·거래량 통합</a></nav>'}
async function json(url){let r=await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status+' '+url);return await r.json()}
async function finance(){return json(BCI.local?'/api/preview':'./data/atlas.json')}
async function market(){if(!BCI.local)return null;return json('/api/market')}
function fmtReason(data){return '<span class="small">'+escapeHtml(data?.risks?.length?data.risks.slice(0,3).join(' · '):'공식 IBD 판정이 아닌 BCI 검증 모델')+'</span>'}
function stageChecklist(m){
 const hist=m?.history||[], h=hist.at(-1)||{}, day=Number(h.rally_day)||0;
 const d1=h.day1_date||null, isFtd=!!(m?.current_ftd_valid&&m?.current_ftd);
 const after=isFtd?hist.findIndex(x=>x.date===m.current_ftd.date):-1;
 const nextDay=day?day+1:null, eligible=nextDay!=null&&nextDay>=4&&!!d1;
 const threshold=Number(m?.ftd_threshold_pct??1.25);
 const closeTarget=Number.isFinite(Number(h.close))&&h.close>0?h.close*(1+threshold/100):null;
 const lastVolume=Number.isFinite(Number(h.volume))&&h.volume>0?h.volume:null;
 // Next session's rolling 50-day volume reference must include the latest session.
 const previous50=hist.slice(-50).map(x=>x.volume);
 const valid50=previous50.length===50&&previous50.every(v=>v!=null&&Number.isFinite(Number(v))&&Number(v)>0);
 const ma50=valid50?previous50.reduce((a,b)=>a+Number(b),0)/50:null;
 const items=[
  {n:'01',name:'Day 1 저점 유지',ok:!!d1,info:d1?'Day 1 '+dateFmt(d1)+' · 저가 '+fmt(h.day1_low,2):'Day 1 미확인 · 다음 반등시도 관찰'},
  {n:'02',name:'FTD는 Day 4부터 검토',ok:eligible,info:nextDay?'다음 거래일 예상 Day '+nextDay+(eligible?' · 검사 가능':' · 아직 검사 불가'):'새 Day 1 대기'},
  {n:'03',name:'당일 지수 종가 +'+fmt(threshold,2)+'% 이상',ok:null,info:closeTarget==null?'전일 종가 미확인':'다음 거래일 종가 '+fmt(closeTarget,2)+' 초과/이상 (반올림 표시)'},
  {n:'04',name:'당일 거래량 > 전일 거래량',ok:null,info:lastVolume==null?'전일 거래량 미확인':'다음 거래일 거래량 '+fmtVol(lastVolume)+' 초과'},
 ];
 return {items,ftd:isFtd,after:after<0?null:hist.length-1-after,eligible,nextDay,closeTarget,lastVolume,ma50,threshold,
  enhancedTarget:ma50==null?null:ma50*1.4};
}
function fmtVol(v){return v==null?'—':fmt(v/1e6,2)+'백만주'}
function fourPrices(h){return '<div class="ohlc-row">'+[['시가',h?.open],['고가',h?.high],['저가',h?.low],['종가',h?.close]].map(([n,v])=>'<div><small>'+n+'</small><b>'+fmt(v,2)+'</b></div>').join('')+'</div>'}
function oneMarket(m,name){
 if(!m)return '<section class="panel"><h2>'+marketCode(name)+'</h2><div class="empty">시장 자료가 아직 없습니다.</div></section>';
 const all=m.history||[],h=all.at(-1)||{},life=m.distribution_lifecycle||{};
 const recent=life.recent_events||[],day1=all.find(x=>x.date===h.day1_date);
 const ftd=m.current_ftd_valid&&m.current_ftd?m.current_ftd:null;
 const check=stageChecklist(m),lastFtd=m.recent_ftd||null;
 const quality=m.signal_quality||'데이터 품질 미확인';
 const progress=ftd?'FTD 발생 · '+(check.after??0)+'거래일 경과':h.rally_day?'반등 시도 Day '+h.rally_day:'새 Day 1 관찰';
 const recentLow=all.slice(-25).filter(x=>x.low!=null).reduce((a,x)=>!a||x.low<a.low?x:a,null);
 const showConditions=check.items.map(c=>'<div class="ftd-condition"><span class="condition-mark '+(c.ok===true?'yes':'wait')+'">'+(c.ok===true?'✓':'·')+'</span><div><b>'+escapeHtml(c.name)+'</b><small>'+escapeHtml(c.info)+'</small></div></div>').join('');
 const lifetime=recent.map(e=>'<tr><td>'+dateFmt(e.date)+'</td><td>'+pct(e.decline_pct)+'</td><td>'+fmt(e.volume_ratio,3)+'배</td><td>'+e.age_sessions+'일</td><td>'+escapeHtml(e.status)+'</td><td>'+(e.counted_now?'<b class="status-live">'+e.remaining_sessions+'거래일 후 만료</b>':dateFmt(e.cleared_date))+'</td></tr>').join('');
 const latestNote='기준 데이터: '+dateFmt(m.last_date)+' 확정 거래일 · 실시간 시세 아님';
 const volStats=[
  ['직전 거래일 지수 거래량',fmtVol(check.lastVolume)],
  ['다음 거래일 50일 평균',fmtVol(check.ma50)],
  ['전일보다 증가할 기준',check.lastVolume!=null?fmtVol(check.lastVolume)+' 초과':'—'],
  ['50일 평균 140% 연구 기준',check.enhancedTarget!=null?fmtVol(check.enhancedTarget)+' 이상':'50개 유효 거래일 필요']
 ];
 const futurePanel='<div class="ftd-track"><div class="box-title"><b>다음 거래일 FTD 발생조건</b><small>'+latestNote+'</small></div>'+
 '<div class="ftd-condition-summary">'+(!h.day1_date?'먼저 새로운 반등 Day 1이 확인되어야 합니다.':check.eligible?'다음 거래일에 다음 조건을 함께 충족하면 BCIP FTD 후보를 판정합니다.':'다음 거래일은 '+(check.nextDay?'Day '+check.nextDay:'Day 1 대기')+'입니다. Day 4 이전에는 상승률과 거래량이 충족되어도 FTD로 판정하지 않습니다.')+'</div>'+
 '<div class="ftd-conditions">'+showConditions+'</div>'+
 '<div class="volume-grid">'+volStats.map(([k,v])=>'<div class="volume-stat"><small>'+escapeHtml(k)+'</small><strong>'+escapeHtml(v)+'</strong></div>').join('')+'</div>'+
 '<div class="small">** BCIP 기본 FTD 연구조건: 반등 Day 4 이상 · 당일 지수 상승률 +'+fmt(check.threshold,2)+'% 이상 · 당일 지수 거래량이 전일보다 증가 · Day 1 저점 방어. '+
 '50일 평균 대비 40% 증가는 별도 강화 연구조건이며 공식 IBD의 보편적인 필수조건이 아닙니다. 다음날 실제 체결량이 확정되기 전에는 신호를 확정하지 않습니다.</div></div>';
 const actualFtd=ftd?'<div class="ftd-volume"><div class="box-title"><b>현재 FTD 확인 기록</b><small>신호 발생 '+dateFmt(ftd.date)+'</small></div><div class="volume-grid">'+[
  ['FTD 당일 지수 상승률',pct(ftd.gain_pct)],
  ['FTD 당일 거래량',fmtVol(ftd.volume)],
  ['직전 거래일 거래량',fmtVol(ftd.previous_volume)],
  ['FTD/전일 거래량',ftd.volume_ratio!=null?fmt(ftd.volume_ratio,3)+'배':'—'],
  ['FTD/50일 거래량 평균',ftd.volume_vs_ma50!=null?fmt(ftd.volume_vs_ma50,3)+'배':'—']
 ].map(([k,v])=>'<div class="volume-stat"><small>'+escapeHtml(k)+'</small><strong>'+escapeHtml(v)+'</strong></div>').join('')+'</div></div>':futurePanel;
 const historical=lastFtd?'<details class="dist-details"><summary>과거 마지막 FTD 기록 · '+dateFmt(lastFtd.date)+' (현재 판정에 사용하지 않음)</summary>'+
 '<div class="volume-grid">'+[
 ['발생일',dateFmt(lastFtd.date)],['당일 상승률',pct(lastFtd.gain_pct)],['당일 거래량',fmtVol(lastFtd.volume)],
 ['전일 거래량',fmtVol(lastFtd.previous_volume)],['거래량/전일',lastFtd.volume_ratio!=null?fmt(lastFtd.volume_ratio,3)+'배':'—'],
 ['거래량/50일 평균',lastFtd.volume_vs_ma50!=null?fmt(lastFtd.volume_vs_ma50,3)+'배':'—']
 ].map(([k,v])=>'<div class="volume-stat"><small>'+escapeHtml(k)+'</small><strong>'+escapeHtml(v)+'</strong></div>').join('')+'</div><p class="small">과거 발생 사실과 현재 유효성은 서로 다릅니다.</p></details>':'';
 return '<section class="panel market-detail"><div class="marketh"><h2>'+marketCode(name)+'</h2>'+badge(check.ftd?'good':'warning',m.last_state||'미확인')+'</div>'+
 '<div class="small">'+latestNote+' · 공식 IBD Market Pulse가 아닌 BCIP 연구 신호</div>'+
 '<div class="kpi market-kpi"><div><small>현재 시장 상태</small><strong>'+escapeHtml(progress)+'</strong></div><div><small>최근 25거래일 분산일 발생</small><strong class="large">'+(life.recent_occurrences??'—')+'건</strong></div><div><small>현재 미소멸 분산일</small><strong class="large">'+(life.unexpired_uncleared??'—')+'건</strong></div></div>'+
 actualFtd+
 '<details class="dist-details"><summary>Day 1과 최신 거래일 시가·고가·저가·종가 자세히 보기</summary>'+
 '<div class="market-ohlc"><div class="box-title"><b>반등 Day 1</b><small>'+dateFmt(day1?.date)+(day1?' · 확인':' · 미확인')+'</small></div>'+fourPrices(day1)+
 '<div class="box-title" style="margin-top:12px"><b>최신 거래일</b><small>'+dateFmt(h.date)+'</small></div>'+fourPrices(h)+'</div>'+
 '<div class="data-row"><span class="muted">반등 Day 1 장중 저점</span><b>'+fmt(day1?.low,2)+'</b></div>'+
 '<div class="data-row"><span class="muted">최근 25거래일 장중 최저</span><b>'+fmt(recentLow?.low,2)+' · '+dateFmt(recentLow?.date)+'</b></div></details>'+
 historical+
 '<details class="dist-details"><summary>분산일 발생 · 25거래일 만료 · 5% 회복 장부 ('+(life.recent_occurrences??0)+'건 발생)</summary>'+
 '<div class="small">거래일 경과 또는 장중 5% 회복으로 소멸된 사유를 보존합니다. 국면 전환을 이유로 원본 발생 기록을 삭제하지 않습니다. 25일 만료 '+(life.expiry_today??0)+'건 · 5% 회복 소멸 '+(life.relief_today??0)+'건</div>'+
 '<div class="tablewrap"><table><thead><tr><th>발생일</th><th>하락률</th><th>거래량/전일</th><th>경과 거래일</th><th>현재 상태</th><th>남은 기간/해제일</th></tr></thead><tbody>'+lifetime+'</tbody></table></div></details>'+
 '<div class="small">자료 품질: '+escapeHtml(quality)+' · 50일 평균은 마지막 50개 거래일 기준이며, 자료가 부족하면 수치를 만들지 않습니다.</div></section>';
}
function mkNotice(d){if(!BCI.local)return '공개 페이지에서는 KRX 시세·지수 거래량·기관 수급을 표시하지 않습니다. PC의 http://127.0.0.1:8765/ 로 접속하세요.';return '코스피와 코스닥을 각각 추적합니다. FTD와 분산일은 공개 규칙에 대한 연구용 자동검출이며, 공식 IBD Market Pulse 판정이 아닙니다.'}
