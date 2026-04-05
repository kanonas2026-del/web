/* 修正版：既存機能 + 解析UI（簡易） */

console.log("FIXED IMPORT SCORE");

// === 既存最低限機能復元 ===
const fileInput = document.getElementById('fileInput');
const addMoreBtn = document.getElementById('addMoreBtn');
const backTopBtn = document.getElementById('backTopBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const processedCanvas = document.getElementById('processedCanvas');

let currentImage = null;

// 画像読み込み
fileInput?.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = ()=>{
    currentImage = new Image();
    currentImage.onload = ()=>{
      drawToCanvas(currentImage, sourceCanvas);
      drawToCanvas(currentImage, processedCanvas);
      runAnalysis();
    };
    currentImage.src = reader.result;
  };
  reader.readAsDataURL(file);
});

addMoreBtn?.addEventListener('click', ()=>{
  fileInput.click();
});

// TOP戻る
backTopBtn?.addEventListener('click', ()=>{
  location.href = "./index.html";
});

function drawToCanvas(img, canvas){
  if(!canvas) return;
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img,0,0);
}

// === 解析UI追加 ===
function ensureAnalysisUi(){
  if(document.getElementById("analysisCanvas")) return;

  const parent = document.querySelector(".main-stack");
  if(!parent) return;

  const div = document.createElement("div");
  div.innerHTML = `
    <h2 style="margin-top:20px">TAB解析候補</h2>
    <canvas id="analysisCanvas" style="width:100%;border:1px solid #444;"></canvas>
    <div id="analysisText" style="color:#aaa;font-size:12px">未解析</div>
  `;
  parent.appendChild(div);
}

function runAnalysis(){
  ensureAnalysisUi();

  const canvas = document.getElementById("analysisCanvas");
  if(!canvas || !processedCanvas) return;

  canvas.width = processedCanvas.width;
  canvas.height = processedCanvas.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(processedCanvas,0,0);

  // テスト線（動作確認）
  ctx.strokeStyle = "red";
  for(let i=0;i<5;i++){
    ctx.beginPath();
    ctx.moveTo(0, i*50+30);
    ctx.lineTo(canvas.width, i*50+30);
    ctx.stroke();
  }

  document.getElementById("analysisText").textContent = "解析OK（暫定）";
}
