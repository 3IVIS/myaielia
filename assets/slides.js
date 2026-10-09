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
    var auto=root.getAttribute('data-auto')!=='off'&&!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
    var playBtn=null;
    if(auto){playBtn=document.createElement('button');playBtn.type='button';playBtn.className='st-play';playBtn.setAttribute('aria-label','Pause automatic slides');playBtn.textContent='❚❚';nav.insertBefore(playBtn,nav.firstChild);}
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
    /* auto-rotate: advances while visible; any click/key/swipe pauses it for 30 s;
       hover or keyboard focus holds it; the Pause button stops it until pressed again. */
    var timer=null,userPaused=false,holdUntil=0,visible=false,hovering=false;
    function delay(){var t=(slides[idx].textContent||'').length;return Math.min(16000,Math.max(7000,5000+t*45));}
    function clear(){if(timer){clearTimeout(timer);timer=null;}}
    function schedule(){
      clear();
      if(!auto||userPaused||!visible||hovering)return;
      var wait=Math.max(delay(),holdUntil-Date.now()+500);
      timer=setTimeout(function(){idx=(idx+1)%slides.length;show();},wait);
    }
    function interacted(){holdUntil=Date.now()+30000;schedule();}
    if(auto){
      var baseShow=show;
      show=function(){baseShow();schedule();};
      root.addEventListener('click',function(e){if(e.target.closest('.st-play'))return;interacted();});
      root.addEventListener('keydown',interacted);
      root.addEventListener('touchstart',interacted,{passive:true});
      root.addEventListener('mouseenter',function(){hovering=true;clear();});
      root.addEventListener('mouseleave',function(){hovering=false;holdUntil=Math.max(holdUntil,Date.now()+3000);schedule();});
      playBtn.addEventListener('click',function(){
        userPaused=!userPaused;
        playBtn.textContent=userPaused?'▶':'❚❚';
        playBtn.setAttribute('aria-label',userPaused?'Resume automatic slides':'Pause automatic slides');
        root.querySelector('.st-slides').setAttribute('aria-live',userPaused?'polite':'off');
        schedule();
      });
      root.querySelector('.st-slides').setAttribute('aria-live','off');
      if('IntersectionObserver' in window){
        new IntersectionObserver(function(es){visible=es[0].isIntersecting;schedule();},{threshold:0.5}).observe(root);
      }
    }
    show();
  });
})();
