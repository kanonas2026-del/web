const disabledButtons=document.querySelectorAll('.teacher-btn.disabled');
disabledButtons.forEach(btn=>{
  btn.addEventListener('click',e=>{
    e.preventDefault();
    btn.animate(
      [{transform:'scale(1)',opacity:0.55},{transform:'scale(0.985)',opacity:0.75},{transform:'scale(1)',opacity:0.55}],
      {duration:180,easing:'ease-out'}
    );
  });
});
