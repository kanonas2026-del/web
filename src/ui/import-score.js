// TAB解析候補 有効版
console.log("IMPORT SCORE JS LOADED - ANALYSIS ENABLED");

function ensureAnalysisUi(){
  if(document.getElementById('analysisCanvas')) return;

  const mainStack = document.querySelector('.main-stack');

  const section = document.createElement('section');
  section.className = 'card';

  section.innerHTML = `
    <div class="panel-head">
      <h2>TAB解析候補</h2>
      <span class="pill subtle">有効</span>
    </div>
    <canvas id="analysisCanvas" style="width:100%;border:1px solid #333;"></canvas>
    <div id="analysisText" style="font-size:12px;color:#aaa;margin-top:8px;"></div>
  `;

  mainStack.appendChild(section);
}

function runAnalysisOnProcessedCanvas(){
  const canvas = document.getElementById('analysisCanvas');
  const processed = document.getElementById('processedCanvas');
  if(!canvas || !processed) return;

  canvas.width = processed.width;
  canvas.height = processed.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(processed,0,0);

  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;

  for(let i=0;i<5;i++){
    ctx.beginPath();
    ctx.moveTo(0, i*40+20);
    ctx.lineTo(canvas.width, i*40+20);
    ctx.stroke();
  }

  document.getElementById('analysisText').textContent =
    "解析起動OK";
}

setTimeout(()=>{
  ensureAnalysisUi();
  runAnalysisOnProcessedCanvas();
},500);
