/* Step-by-step slides: any element with [data-stepper] containing .st-slide items.
   Adds Back/Next, dots, arrow keys (when the stepper has focus) and swipe. */
(function(){
  document.documentElement.classList.add('js');
  [].forEach.call(document.querySelectorAll('[data-stepper]'),function(root){
    var slides=[].slice.call(root.querySelectorAll('.st-slide')),idx=0;
    if(slides.length<2)return;
    var label=root.getAttribute('data-label')||'Step';
    var nav=document.createElement('div');nav.className='st-nav';
    nav.innerHTML='<button type="button" class="st-btn ghost" data-prev>← Back</button><div class="st-dots"></div><button type="button" class="st-btn" data-next>Next →</button>';
    root.appendChild(nav);
    var prev=nav.querySelector('[data-prev]'),next=nav.querySelector('[data-next]'),dots=nav.querySelector('.st-dots');
    slides.forEach(function(s,i){
      var n=s.querySelector('.st-n');
      if(n&&!n.getAttribute('data-keep'))n.textContent=n.textContent?n.textContent+' · '+(i+1)+' of '+slides.length:label+' '+(i+1)+' of '+slides.length;
    });
    root.setAttribute('tabindex','0');root.setAttribute('role','group');root.setAttribute('aria-roledescription','carousel');
    function show(){
      slides.forEach(function(s,i){s.classList.toggle('active',i===idx);s.setAttribute('aria-hidden',i===idx?'false':'true');});
      dots.innerHTML='';
      slides.forEach(function(_,i){var d=document.createElement('button');d.type='button';d.className='st-dot'+(i===idx?' on':'');d.setAttribute('aria-label','Go to '+label.toLowerCase()+' '+(i+1));d.addEventListener('click',function(){idx=i;show();});dots.appendChild(d);});
      prev.disabled=idx===0;next.textContent=idx===slides.length-1?'Start over ↺':'Next →';
    }
    prev.addEventListener('click',function(){if(idx>0){idx--;show();}});
    next.addEventListener('click',function(){idx=idx===slides.length-1?0:idx+1;show();});
    root.addEventListener('keydown',function(e){
      if(e.target!==root)return;
      if(e.key==='ArrowRight'&&idx<slides.length-1){idx++;show();e.preventDefault();}
      if(e.key==='ArrowLeft'&&idx>0){idx--;show();e.preventDefault();}
    });
    var x0=null;
    root.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
    root.addEventListener('touchend',function(e){
      if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;x0=null;
      if(Math.abs(dx)<50)return;
      if(dx<0&&idx<slides.length-1){idx++;show();}else if(dx>0&&idx>0){idx--;show();}
    },{passive:true});
    show();
  });
})();
