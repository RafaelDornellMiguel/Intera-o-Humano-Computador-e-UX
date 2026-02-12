
    // --- Dados base: heurísticas de Nielsen ---
    const HEURISTICS = [
      { id:1, title:"Visibilidade do status do sistema", tip:"O sistema deve manter o usuário informado sobre o que está acontecendo (ex.: carregando, progresso, confirmações)." },
      { id:2, title:"Correspondência entre o sistema e o mundo real", tip:"Use linguagem e conceitos do usuário, não jargões técnicos." },
      { id:3, title:"Controle e liberdade do usuário", tip:"Permita desfazer/refazer, cancelar, sair de estados indesejados." },
      { id:4, title:"Consistência e padrões", tip:"Siga convenções de plataforma; elementos similares devem ter aparência e comportamento consistentes." },
      { id:5, title:"Prevenção de erros", tip:"Projete para evitar erros ou confirme ações perigosas antes de executá-las." },
      { id:6, title:"Reconhecimento em vez de memorização", tip:"Minimize a carga de memória: torne ações, opções e objetos visíveis." },
      { id:7, title:"Flexibilidade e eficiência de uso", tip:"Atalhos, personalização e caminhos rápidos para usuários experientes." },
      { id:8, title:"Estética e design minimalista", tip:"Somente o essencial na tela; evite ruído visual e textos desnecessários." },
      { id:9, title:"Ajudar usuários a reconhecer, diagnosticar e recuperar-se de erros", tip:"Mensagens de erro claras, orientadas à ação, sem códigos obscuros." },
      { id:10, title:"Ajuda e documentação", tip:"Forneça ajuda pesquisável, exemplos e passos, mesmo que o sistema seja fácil de usar." },
    ];

    // --- Estado e persistência ---
    const state = {
      group: { name:"", course:"", members:[] },
      iface: { type:"Sistema acadêmico", name:"", url:"", tasks:[] },
      issues: [],        // {id, heuristicId, severity, desc, solution}
      top3: [],          // array de ids de issues
      timerEnd: null
    };
    const LS_KEY = "ihc-nielsen-project-v1";

    function loadState(){
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return;
      try{
        const s = JSON.parse(raw);
        Object.assign(state, s);
      }catch(e){ console.warn("Falha ao carregar", e); }
    }
    function saveState(){
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    }

    // --- UI fill ---
    function fillHeuristicsList(){
      const list = document.getElementById("heurList");
      list.innerHTML = "";
      HEURISTICS.forEach(h=>{
        const el = document.createElement("div");
        el.className = "card";
        el.innerHTML = `
          <strong>${h.id}. ${h.title}</strong>
          <div class="small muted">${h.tip}</div>
        `;
        list.appendChild(el);
      });

      const sel = document.getElementById("hSelect");
      sel.innerHTML = HEURISTICS.map(h=>`<option value="${h.id}">${h.id} – ${h.title}</option>`).join("");
    }

    function refreshIssues(){
      const wrap = document.getElementById("issuesList");
      wrap.innerHTML = "";
      if(!state.issues.length){
        wrap.innerHTML = `<div class="small muted">Nenhum problema registrado ainda.</div>`;
        document.getElementById("top3").innerHTML = "";
        return;
      }
      state.issues
        .slice()
        .sort((a,b)=>b.severity - a.severity)
        .forEach(issue=>{
          const h = HEURISTICS.find(x=>x.id===issue.heuristicId);
          const div = document.createElement("div");
          div.className = "card";
          div.innerHTML = `
            <div class="row" style="justify-content:space-between">
              <div><span class="badge">#${issue.id}</span> <strong>${h.id}. ${h.title}</strong></div>
              <div class="${issue.severity>=3?'danger':'ok'}"><strong>Severidade:</strong> ${issue.severity}</div>
            </div>
            <div class="small"><strong>Problema:</strong> ${escapeHtml(issue.desc)}</div>
            <div class="small"><strong>Solução proposta:</strong> ${escapeHtml(issue.solution)}</div>
            <div class="row" style="margin-top:8px">
              <button class="btn" data-action="edit" data-id="${issue.id}">Editar</button>
              <button class="btn danger" data-action="del" data-id="${issue.id}">Excluir</button>
              <label class="pill"><input type="checkbox" class="chkTop3" data-id="${issue.id}" ${state.top3.includes(issue.id)?'checked':''}/> <span>Top 3</span></label>
            </div>
          `;
          wrap.appendChild(div);
        });
      renderTop3();
    }

    function renderTop3(){
      const container = document.getElementById("top3");
      container.innerHTML = "";
      const selected = state.top3.map(id => state.issues.find(i=>i.id===id)).filter(Boolean);
      if(!selected.length){
        container.innerHTML = `<span class="small muted">Nenhum selecionado ainda. Marque no cartão do problema.</span>`;
        return;
      }
      selected.forEach(i=>{
        const h = HEURISTICS.find(x=>x.id===i.heuristicId);
        const tag = document.createElement("span");
        tag.className="pill";
        tag.innerHTML = `<span>🔥</span><span>#${i.id} – H${h.id} – Sev ${i.severity}</span>`;
        container.appendChild(tag);
      });
      if(selected.length>3){
        container.appendChild(Object.assign(document.createElement("div"),{className:"small danger", innerText:"Atenção: selecione no máximo 3."}));
      }
    }

    // --- Helpers ---
    function escapeHtml(s){
      return String(s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
    }
    function uid(){
      return (state.issues.reduce((max,i)=>Math.max(max,i.id||0),0)+1);
    }

    // --- Relatório (Markdown) ---
    function buildMarkdown(){
      const date = new Date().toLocaleString();
      const mem = state.group.members.join(", ");
      const tasks = state.iface.tasks.map(t=>`- ${t}`).join("\n");
      const issuesMD = state.issues.map(i=>{
        const h = HEURISTICS.find(x=>x.id===i.heuristicId);
        return `### #${i.id} — ${h.id}. ${h.title}
**Descrição:** ${i.desc}
**Heurística violada:** ${h.id}. ${h.title}
**Solução proposta:** ${i.solution}
**Severidade:** ${i.severity}
`;
      }).join("\n");

      const top3MD = state.top3
        .map(id=>state.issues.find(i=>i.id===id))
        .filter(Boolean)
        .map(i=>{
          const h = HEURISTICS.find(x=>x.id===i.heuristicId);
          return `- #${i.id} — **${h.title}** (Sev ${i.severity}): ${i.desc}`;
        }).join("\n");

      return `# Análise Heurística de Usabilidade – Nielsen
**Data:** ${date}

## Grupo
- **Nome do grupo:** ${state.group.name||"-"}
- **Disciplina:** ${state.group.course||"-"}
- **Integrantes:** ${mem||"-"}

## Interface analisada
- **Tipo:** ${state.iface.type||"-"}
- **Nome:** ${state.iface.name||"-"}
- **URL:** ${state.iface.url||"-"}

## Tarefas simuladas
${tasks||"-"}

---

## Revisão das Heurísticas de Nielsen
${HEURISTICS.map(h=>`- **${h.id}. ${h.title}** — ${h.tip}`).join("\n")}

---

## Problemas identificados
${issuesMD||"_Nenhum problema registrado._"}

---

## Top 3 problemas para apresentação
${top3MD||"_Nenhum selecionado._"}

---

## Conclusão
As propostas visam melhorar a eficiência, reduzir erros e aumentar a satisfação do usuário. Recomenda-se priorizar correções de severidade 3–4 em tarefas críticas.

`;
    }

    // --- Slides (HTML simples) ---
    function buildSlides(){
      const wrap = document.getElementById("slidesWrap");
      wrap.innerHTML = "";
      const slide = (title, body) => {
        const s = document.createElement("div");
        s.className = "slide";
        s.innerHTML = `<h3>${title}</h3><div class="small">${body}</div>`;
        wrap.appendChild(s);
      };

      slide("Título & Equipe",
        `<strong>${escapeHtml(state.group.name||"Grupo IHC")}</strong><br/>
         Disciplina: ${escapeHtml(state.group.course||"-")}<br/>
         Integrantes: ${escapeHtml(state.group.members.join(", ")||"-")}`);

      slide("Interface escolhida",
        `Tipo: ${escapeHtml(state.iface.type||"-")}<br/>
         Nome: ${escapeHtml(state.iface.name||"-")}<br/>
         URL: ${escapeHtml(state.iface.url||"-")}<br/><br/>
         <strong>Tarefas simuladas:</strong><br/>
         <ul>${state.iface.tasks.map(t=>`<li>${escapeHtml(t)}</li>`).join("")||"<li>-</li>"}</ul>`);

      slide("Critérios (Nielsen)",
        `<ul>${HEURISTICS.map(h=>`<li>${h.id}. ${escapeHtml(h.title)}</li>`).join("")}</ul>`);

      const selected = state.top3.map(id=>state.issues.find(i=>i.id===id)).filter(Boolean);
      if(selected.length){
        selected.forEach((i, idx)=>{
          const h = HEURISTICS.find(x=>x.id===i.heuristicId);
          slide(`Top ${idx+1}: ${escapeHtml(h.title)} (Sev ${i.severity})`,
            `<strong>Problema:</strong> ${escapeHtml(i.desc)}<br/>
             <strong>Solução:</strong> ${escapeHtml(i.solution)}`);
        });
      } else {
        slide("Top 3 problemas", "Selecione até 3 problemas na lista para montar estes slides.");
      }

      slide("Encerramento",
        "Perguntas? Obrigado!<br/>Próximos passos: priorização e implementação.");
      document.getElementById("slides").classList.add("active");
    }

    // --- Timer ---
    let timerInterval = null;
    function startTimer(minutes){
      clearInterval(timerInterval);
      const end = Date.now() + minutes*60*1000;
      state.timerEnd = end;
      saveState();
      tickTimer();
      timerInterval = setInterval(tickTimer, 1000);
    }
    function tickTimer(){
      if(!state.timerEnd){
        document.getElementById("timer").textContent = "00:00:00";
        return;
      }
      const remaining = state.timerEnd - Date.now();
      const t = Math.max(0, Math.floor(remaining/1000));
      const h = String(Math.floor(t/3600)).padStart(2,"0");
      const m = String(Math.floor((t%3600)/60)).padStart(2,"0");
      const s = String(t%60).padStart(2,"0");
      document.getElementById("timer").textContent = `${h}:${m}:${s}`;
      if(remaining<=0){
        clearInterval(timerInterval);
        document.getElementById("timer").textContent = "00:00:00";
        alert("Tempo esgotado! Finalize o relatório e os slides.");
      }
    }

    // --- Eventos & inicialização ---
    function init(){
      loadState();
      fillHeuristicsList();
      // Preencher campos se já houver estado salvo
      document.getElementById("groupName").value = state.group.name||"";
      document.getElementById("course").value = state.group.course||"";
      document.getElementById("members").value = (state.group.members||[]).join("\n");

      document.getElementById("ifaceType").value = state.iface.type||"Sistema acadêmico";
      document.getElementById("ifaceName").value = state.iface.name||"";
      document.getElementById("ifaceURL").value = state.iface.url||"";
      document.getElementById("tasks").value = (state.iface.tasks||[]).join("\n");

      refreshIssues();
      if(state.timerEnd){
        timerInterval = setInterval(tickTimer, 1000);
        tickTimer();
      }

      // Botões
      document.getElementById("saveGrp").addEventListener("click", ()=>{
        state.group.name = document.getElementById("groupName").value.trim();
        state.group.course = document.getElementById("course").value.trim();
        state.group.members = document.getElementById("members").value.split("\n").map(s=>s.trim()).filter(Boolean);
        saveState();
        const el = document.getElementById("grpSavedInfo");
        el.textContent = "Grupo salvo!";
        setTimeout(()=>el.textContent="", 1500);
      });

      document.getElementById("saveIface").addEventListener("click", ()=>{
        state.iface.type = document.getElementById("ifaceType").value;
        state.iface.name = document.getElementById("ifaceName").value.trim();
        state.iface.url = document.getElementById("ifaceURL").value.trim();
        state.iface.tasks = document.getElementById("tasks").value.split("\n").map(s=>s.trim()).filter(Boolean);
        saveState();
        const el = document.getElementById("ifaceSavedInfo");
        el.textContent = "Interface salva!";
        setTimeout(()=>el.textContent="", 1500);
      });

      document.getElementById("addIssue").addEventListener("click", ()=>{
        const heuristicId = parseInt(document.getElementById("hSelect").value,10);
        const severity = parseInt(document.getElementById("severity").value,10);
        const desc = document.getElementById("desc").value.trim();
        const solution = document.getElementById("solution").value.trim();
        if(!desc || !solution){ alert("Preencha descrição e solução."); return; }
        const id = uid();
        state.issues.push({ id, heuristicId, severity, desc, solution });
        saveState();
        document.getElementById("desc").value="";
        document.getElementById("solution").value="";
        refreshIssues();
      });

      document.getElementById("clearForm").addEventListener("click", ()=>{
        document.getElementById("desc").value="";
        document.getElementById("solution").value="";
      });

      document.getElementById("issuesList").addEventListener("click", (e)=>{
        const btn = e.target.closest("button");
        if(!btn) return;
        const action = btn.dataset.action;
        const id = parseInt(btn.dataset.id,10);
        const idx = state.issues.findIndex(i=>i.id===id);
        if(idx<0) return;
        if(action==="del"){
          if(confirm("Excluir este problema?")){
            // remover também de top3
            state.top3 = state.top3.filter(x=>x!==id);
            state.issues.splice(idx,1);
            saveState();
            refreshIssues();
          }
        }
        if(action==="edit"){
          const issue = state.issues[idx];
          document.getElementById("hSelect").value = issue.heuristicId;
          document.getElementById("severity").value = issue.severity;
          document.getElementById("desc").value = issue.desc;
          document.getElementById("solution").value = issue.solution;
          // ao salvar, criará novo; usuário pode excluir o antigo
          alert("Edite os campos e clique em 'Adicionar Problema' para criar uma versão atualizada. Depois, exclua o antigo.");
        }
      });

      document.getElementById("issuesList").addEventListener("change", (e)=>{
        const chk = e.target.closest(".chkTop3");
        if(!chk) return;
        const id = parseInt(chk.dataset.id,10);
        if(chk.checked){
          if(state.top3.length>=3){
            alert("Selecione no máximo 3 problemas.");
            chk.checked = false;
            return;
          }
          if(!state.top3.includes(id)) state.top3.push(id);
        }else{
          state.top3 = state.top3.filter(x=>x!==id);
        }
        saveState();
        renderTop3();
      });

      document.getElementById("genSlides").addEventListener("click", ()=>{
        if(state.top3.length===0) alert("Selecione ao menos 1 problema para os slides.");
        buildSlides();
        document.getElementById("slides").scrollIntoView({behavior:"smooth"});
      });

      document.getElementById("genReport").addEventListener("click", ()=>{
        const md = buildMarkdown();
        const pre = document.getElementById("reportMD");
        pre.textContent = md;
        document.getElementById("reportPanel").style.display = "block";
        document.getElementById("exportInfo").textContent = "Relatório gerado (Markdown).";
      });

      document.getElementById("downloadReport").addEventListener("click", ()=>{
        const md = buildMarkdown();
        const blob = new Blob([md], {type:"text/markdown;charset=utf-8"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "relatorio-analise-heuristica.md";
        a.click();
        URL.revokeObjectURL(a.href);
      });

      document.getElementById("printReport").addEventListener("click", ()=>{
        const md = buildMarkdown();
        const w = window.open("", "_blank");
        w.document.write(`<pre style="white-space:pre-wrap; font-family:ui-monospace; padding:16px">${escapeHtml(md)}</pre>`);
        w.document.close();
        w.focus();
        w.print();
      });

      document.getElementById("resetAll").addEventListener("click", ()=>{
        if(confirm("Isso apagará todo o conteúdo salvo. Deseja continuar?")){
          localStorage.removeItem(LS_KEY);
          location.reload();
        }
      });

      document.getElementById("start60").addEventListener("click", ()=>startTimer(60));
      document.getElementById("start90").addEventListener("click", ()=>startTimer(90));
    }

    document.addEventListener("DOMContentLoaded", init);
  