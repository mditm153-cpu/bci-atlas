
'use strict';
const BCI={local:['localhost','127.0.0.1'].includes(location.hostname)&&location.port==='8765',markets:['KOSPI','KOSDAQ'],factors:['C','A','N','S','L','I','M'],names:{C:'분기 실적',A:'연간 성장',N:'새로운 변화',S:'수요·거래량',L:'주도주·RS',I:'기관 참여',M:'시장 방향'},descs:{C:'분기 EPS·매출액 YoY',A:'연간 EPS 성장 및 지속성',N:'신규 변화의 긍정·부정 공시 후보',S:'주봉 지지·매집·손잡이 거래량·피벗',L:'RS 1·3·6·12개월과 주도력',I:'기관·외국인 5·20·60일 수급',M:'코스피·코스닥 FTD·분산일'}};
function el(id){return document.getElementById(id)}function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function fmt(v,d=1){return v==null||v===''||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d})}function pct(v){return v==null?'—':(v>0?'+':'')+fmt(v)+'%'}function dateFmt(v){let s=String(v||'').replace(/\D/g,'');return s.length===8?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6):escapeHtml(v||'—')}function krw(v){return v==null?'—':fmt(v/1e8,1)+'억원'}function badge(t,text){return '<span class="pill '+t+'">'+escapeHtml(text)+'</span>'}function marketCode(m){return m==='KOSDAQ'?'코스닥':'코스피'}
function nav(current){return '<nav class="nav" aria-label="CAN SLIM 화면"><a href="./index.html" class="'+(current==='home'?'active':'')+'">종합 메인</a>'+BCI.factors.map(f=>'<a href="./'+f.toLowerCase()+'.html" class="'+(current===f?'active':'')+'">'+f+' · '+BCI.names[f]+'</a>').join('')+'<a href="./matrix.html">전체 조건표</a><a href="./signals.html">RS·거래량 통합</a></nav>'}
async function json(url){let r=await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status+' '+url);return await r.json()}
async function finance(){return json(BCI.local?'/api/preview':'./data/atlas.json')}
async function market(){if(!BCI.local)return null;return json('/api/market')}
function fmtReason(data){return '<span class="small">'+escapeHtml(data?.risks?.length?data.risks.slice(0,3).join(' · '):'공식 IBD 판정이 아닌 BCI 검증 모델')+'</span>'}
function stageChecklist(m) {
 const hist=m?.history||[], h=hist.at(-1)||{}, d1=h.day1_date||null;
 const exists=!!d1, isFtd=!!m?.current_ftd_valid;
 const after=hist.length>0&&isFtd?hist.findIndex(x=>x.date===m.current_ftd.date):-1;
 const days=after>=0?hist.length-1-after:null;
 const threshold=Number(m?.ftd_threshold_pct??1.25);
 const up=h.pct!=null&&h.pct>=threshold, volume=h.vol_change_ratio!=null&&h.vol_change_ratio>1;
 const checkpoints=[
  {n:'01',name:'Day 1 확인 · 장중 저가 유지',ok:exists,info:exists?'저가 '+fmt(h.day1_low,2):'반등 Day 1 미확인'},
  {n:'02',name:'Day 4 이후',ok:exists&&h.rally_day>=4||isFtd,info:isFtd?'FTD 당시 통과':h.rally_day?'현재 Day '+h.rally_day:'진행 전'},
  {n:'03',name:'당일 상승률 +'+threshold.toFixed(2)+'% 이상',ok:up,info:pct(h.pct)},
  {n:'04',name:'전일 대비 지수 거래량 증가',ok:volume,info:h.vol_change_ratio==null?'거래량 미확인':fmt(h.vol_change_ratio,3)+'배'}
 ];
 return {items:checkpoints,day1:d1,ftd:isFtd,after:days};
}
function fmtVol(v){return v==null?'—':fmt(v/1e6,2)+'백만주'}
function fourPrices(h){return '<div class="ohlc-row">'+[['시가',h?.open],['고가',h?.high],['저가',h?.low],['종가',h?.close]].map(([n,v])=>'<div><small>'+n+'</small><b>'+fmt(v,2)+'</b></div>').join('')+'</div>'}
function oneMarket(m,name){
 if(!m)return '<section class="panel"><h2>'+marketCode(name)+'</h2><div class="empty">시장 자료가 아직 없습니다.</div></section>';
 const all=m.history||[],h=all.at(-1)||{},life=m.distribution_lifecycle||{};
 const recent=life.recent_events||[],active=recent.filter(x=>x.counted_now),day1=all.find(x=>x.date===h.day1_date),ftd=m.current_ftd||null;
 const check=stageChecklist(m),recentLow=all.slice(-25).filter(x=>x.low!=null).reduce((a,x)=>!a||x.low<a.low?x:a,null);
 const progress=ftd?'FTD 확인 후 '+check.after+'거래일 경과':h.rally_day?'반등 시도 Day '+h.rally_day:'새 Day 1 관찰';
 const showConditions=check.items.map(c=>'<div class="ftd-condition"><span class="condition-mark '+(c.ok?'yes':'wait')+'">'+(c.ok?'✓':'·')+'</span><div><b>'+c.name+'</b><small>'+c.info+'</small></div></div>').join('');
 const lifetime=recent.map(e=>'<tr><td>'+dateFmt(e.date)+'</td><td>'+pct(e.decline_pct)+'</td><td>'+fmt(e.volume_ratio,3)+'배</td><td>'+(e.age_sessions)+'일</td><td>'+escapeHtml(e.status)+'</td><td>'+(e.counted_now?'<b class="status-live">'+e.remaining_sessions+'거래일 후 만료</b>':dateFmt(e.cleared_date))+'</td></tr>').join('');
 const todayEvents=life.today_lifecycle_events||[];
 const lifeNote='오늘 25일 만료 '+(life.expiry_today??0)+'건 · 장중 5% 회복 해제 '+(life.relief_today??0)+'건';
 const quality=m.signal_quality||'데이터 품질 미확인';
 const yesterday=all.length>1?all[all.length-2]:null;
 const lastFtd=m.recent_ftd||null;
 const ftdVol=lastFtd&&lastFtd.volume!=null?fmtVol(lastFtd.volume):'미확인';
 const ftdPrevious=lastFtd&&lastFtd.previous_volume!=null?fmtVol(lastFtd.previous_volume):'미확인';
 const ftdVsYesterday=lastFtd?.volume_ratio!=null?fmt(lastFtd.volume_ratio,3)+'배':'미확인';
 const ftdVs50=lastFtd?.volume_vs_ma50!=null?fmt(lastFtd.volume_vs_ma50,3)+'배':'미확인';
 const ftdP=lastFtd?.gain_pct!=null?pct(lastFtd.gain_pct):'—';
 const ftdExtra='<div class="ftd-volume"><div class="box-title"><b>FTD 거래량 교차검증</b><small>최종 포착 FTD: '+dateFmt(lastFtd?.date)+' · 현재 유효성과 별도</small></div>'+
 '<div class="volume-grid">'+[
 ['50일 평균 거래량(최근 전일 50거래일)',fmtVol(h.volume_ma50_previous)],
 ['전일 거래량',fmtVol(yesterday?.volume)],
 ['최신일 거래량',fmtVol(h.volume)],
 ['최신일/전일',h.vol_change_ratio!=null?fmt(h.vol_change_ratio,3)+'배':'—'],
 ['최신일/50일 평균',h.volume_to_ma50!=null?fmt(h.volume_to_ma50,3)+'배':'—'],
 ['FTD 당일 지수 상승률',ftdP],
 ['FTD 당시 거래량',ftdVol],
 ['FTD 당시 전일 거래량',ftdPrevious],
 ['FTD 거래량/당시 전일',ftdVsYesterday],
 ['FTD 거래량/당시 50일 평균',ftdVs50]
 ].map(([k,v])=>'<div class="volume-stat"><small>'+k+'</small><strong>'+v+'</strong></div>').join('')+'</div>'+
 '<p class="small">50일 평균은 비교 대상일 이전 50개 거래일로 계산합니다. 평균 대비 배수는 참고 항목이며 FTD 필수조건은 전일보다 많은 거래량입니다. 수정된 상승률 기준은 1.25%입니다.</p></div>';
 return '<section class="panel market-detail"><div class="marketh"><h2>'+marketCode(name)+'</h2>'+badge(check.ftd?'good':'warning',m.last_state||'미확인')+'</div>'+
 '<div class="small">최종 확보 거래일: '+dateFmt(m.last_date)+' · +1.25% FTD 기준 · 공식 IBD Market Pulse가 아닌 BCI 연구 신호</div>'+
 '<div class="kpi market-kpi"><div><small>현재 M 진행 상태</small><strong>'+escapeHtml(progress)+'</strong></div><div><small>최근 25거래일 분산일 발생</small><strong class="large">'+(life.recent_occurrences??'—')+'건</strong></div><div><small>오늘 25거래일 만료</small><strong class="large">'+(life.expiry_today??'—')+'건</strong></div></div>'+
 '<div class="bci-pressure"><b>발생한 분산일 중 아직 25일 경과·5% 해제로 소멸하지 않은 건수: '+(life.unexpired_uncleared??'—')+'건</b><span>현재 국면 초기화 여부와 무관하게 관리 · '+lifeNote+'</span></div>'+
 '<div class="market-ohlc"><div class="box-title"><b>반등 Day 1 · 시가/종가</b><small>'+dateFmt(day1?.date)+' · '+(day1?'검출 당시':'미확인')+'</small></div>'+fourPrices(day1)+'<div class="box-title" style="margin-top:12px"><b>최신 거래일 · 시가/종가</b><small>'+dateFmt(h.date)+'</small></div>'+fourPrices(h)+'</div>'+
 '<div class="data-row"><span class="muted">반등 Day 1 장중 저점</span><b>'+fmt(day1?.low,2)+'</b></div>'+
 '<div class="data-row"><span class="muted">최근 25거래일 장중 최저</span><b>'+fmt(recentLow?.low,2)+' · '+dateFmt(recentLow?.date)+'</b></div>'+
 '<div class="data-row"><span class="muted">현재 FTD 유효 후보</span><b>'+(ftd?dateFmt(ftd.date)+' · Day '+ftd.day+' · '+pct(ftd.gain_pct):'없음')+'</b></div>'+
 '<div class="data-row"><span class="muted">마지막 포착 FTD(현재 유효성 별개)</span><b>'+dateFmt(m.recent_ftd?.date)+'</b></div>'+
 ftdExtra+'<div class="ftd-track"><div class="box-title"><b>FTD 충족 체크리스트</b><small>오늘 최신 거래일 / 조건별 검사</small></div><div class="ftd-conditions">'+showConditions+'</div><p class="small">단순히 4개 체크가 보인다는 뜻으로 FTD를 선언하지 않습니다. Day 4 이후 같은 거래일에서 상승률과 거래량이 동시에 충족돼야 하며, 유효한 Day 1이 먼저 존재해야 합니다. 과거 FTD는 별도 기록됩니다.</p></div>'+
 '<details class="dist-details"><summary>분산일 '+(life.recent_occurrences??0)+'건의 소멸 상태와 날짜 보기</summary><div class="small">발생일을 0일차로 계산합니다. 이후 25번째 거래일에 기간 만료하거나, 그전에 분산일 종가 대비 장중 고가 +5% 도달 시 소멸됩니다. 미래 휴장일을 추정하지 않고 잔여 거래일로 표시합니다.</div><div class="tablewrap"><table><thead><tr><th>발생일</th><th>하락률</th><th>거래량/전일</th><th>지난 거래일</th><th>현재 상태</th><th>남은 기간/해제일</th></tr></thead><tbody>'+lifetime+'</tbody></table></div></details>'+
 '<div class="small">품질: '+escapeHtml(quality)+' · 분산일 3건부터 비중 축소는 오닐의 고정 규칙이 아닌 BCI 가설입니다. 정체일은 별도 조사 후보로 취급합니다.</div></section>';
}
function mkNotice(d){if(!BCI.local)return '공개 페이지에서는 KRX 시세·지수 거래량·기관 수급을 표시하지 않습니다. PC의 http://127.0.0.1:8765/ 로 접속하세요.';return '코스피와 코스닥을 각각 추적합니다. FTD와 분산일은 공개 규칙에 대한 연구용 자동검출이며, 공식 IBD Market Pulse 판정이 아닙니다.'}
