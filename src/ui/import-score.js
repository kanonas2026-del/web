// FIX V3（致命エラー修正 + 動作安定）

console.log("IMPORT SCORE FIX V3");

// ===== 状態 =====
let pages = JSON.parse(localStorage.getItem("ukulele_pages") || "[]");
let activeIndex = pages.length ? pages.length-1 : 0;

// ===== 要素 =====
const fileInput = document.getElementById('fileInput');
const addMoreBtn = document.getElementById('addMoreBtn');
const backTopBtn = document.getElementById('backTopBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const processedCanvas = document.getElementById('processedCanvas');

// ===== UIフィードバック =====
function flash(el){
  if(!el) return;
  el.style.opacity = "0.5";
  setTimeout(()=> el.style.opacity = "1",150);
}

// ===== 保存 =====
function save(){
  localStorage.setItem("ukulele_pages", JSON.stringify(pages));
}

// ===== 描画 =====
function draw(img, canvas){
  if(!canvas) return;
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img,0,0);
}

// ===== 読み込み =====
fileInput?.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = ()=>{
    const img = new Image();
    img.onload = ()=>{

      if(pages.length >= 3){
        alert("最大3枚までです");
        return;
      }

      pages.push(reader.result);
      activeIndex = pages.length -1;
      save();
      render();

    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// ===== ボタン =====
addMoreBtn?.addEventListener('click', ()=>{
  flash(addMoreBtn);
  fileInput.click();
});

backTopBtn?.addEventListener('click', ()=>{
  flash(backTopBtn);
  location.href = "./index.html";
});

// ===== 表示 =====
function render(){
  if(pages.length === 0) return;

  const img = new Image();
  img.onload = ()=>{
    draw(img, sourceCanvas);
    draw(img, processedCanvas);
    runAnalysis();
  };
  img.src = pages[activeIndex];
}

// ===== 解析UI =====
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

  ctx.strokeStyle = "red";
  for(let i=0;i<5;i++){
    ctx.beginPath();
    ctx.moveTo(0, i*50+30);
    ctx.lineTo(canvas.width, i*50+30);
    ctx.stroke();
  }

  document.getElementById('analysisText').textContent =
    "解析OK / 画像数:" + pages.length;
}

// ===== 初期表示 =====
render();
