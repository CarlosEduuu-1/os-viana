(function () {
  var NS = "http://www.w3.org/2000/svg";

  // ---------- Posições no formulário (unidades do PDF, página 1136,76 x 1629,38) ----------
  var POS = {
    nome:{x:69,y:386,w:521}, modelo:{x:606,y:386,w:285}, data:{x:907,y:386,w:200},
    chassi:{x:69,y:432,w:380,ls:1.5}, placa:{x:467,y:432,w:285,ls:1.5}, km:{x:765,y:432,w:170},
    hora:{x:948,y:437,w:160,size:15},
    tel:{x:325,y:477,w:265}, celular:{x:606,y:477,w:285},
    endereco:{x:69,y:523,w:520}, cidade:{x:606,y:523,w:285}, cep:{x:907,y:523,w:200},
    rg:{x:69,y:568,w:240}, cpf:{x:325,y:568,w:265}, email:{x:69,y:614,w:520},
    outro:{x:146,y:338,w:560,size:16}
  };
  var NOVO_BOX = { x: 73.7, y: 454.3 };
  var SERVICES = [
    { k: "oleo", t: "Troca de óleo", x: 80.3, y: 205.0 },
    { k: "oleofiltro", t: "Troca de óleo e filtro", x: 80.3, y: 229.0 },
    { k: "transmissao", t: "Troca conjunto de transmissão", x: 80.3, y: 254.3 },
    { k: "corrente", t: "Ajuste e lubrificação da corrente", x: 80.3, y: 277.7 },
    { k: "lampadas", t: "Substituição de lâmpadas", x: 80.3, y: 302.3 },
    { k: "revisao", t: "Revisão", x: 399.3, y: 205.3 },
    { k: "cabos", t: "Substituição de cabos", x: 399.3, y: 229.3 },
    { k: "pastilha", t: "Substituição de pastilha/lona de freio", x: 399.3, y: 254.7 },
    { k: "pneu", t: "Troca de pneu", x: 399.3, y: 278.0 },
    { k: "acessorios", t: "Instalação de acessórios", x: 399.3, y: 302.7 },
    { k: "outro", t: "Outro", x: 80.3, y: 333.0 }
  ];

  // ---------- Validações ----------
  function digits(s) { return s.replace(/\D/g, ""); }
  function validarCPF(cpf) {
    var d = digits(cpf);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    for (var t = 9; t < 11; t++) {
      var soma = 0;
      for (var i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
      if (((soma * 10) % 11) % 10 !== Number(d[t])) return false;
    }
    return true;
  }
  function maskCPF(v) {
    var d = digits(v).slice(0, 11);
    if (d.length > 9) return d.slice(0,3) + "." + d.slice(3,6) + "." + d.slice(6,9) + "-" + d.slice(9);
    if (d.length > 6) return d.slice(0,3) + "." + d.slice(3,6) + "." + d.slice(6);
    if (d.length > 3) return d.slice(0,3) + "." + d.slice(3);
    return d;
  }
  function maskFone(v) {
    var d = digits(v).slice(0, 11);
    if (d.length > 10) return "(" + d.slice(0,2) + ") " + d.slice(2,7) + "-" + d.slice(7);
    if (d.length > 6) return "(" + d.slice(0,2) + ") " + d.slice(2,6) + "-" + d.slice(6);
    if (d.length > 2) return "(" + d.slice(0,2) + ") " + d.slice(2);
    return d.length ? "(" + d : "";
  }
  function maskCEP(v) {
    var d = digits(v).slice(0, 8);
    return d.length > 5 ? d.slice(0,5) + "-" + d.slice(5) : d;
  }
  function maskKM(v) {
    var d = digits(v).slice(0, 7).replace(/^0+(?=\d)/, "");
    return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function limparChassi(v) { return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17); }
  function maskPlaca(v) {
    var s = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
    return /^[A-Z]{3}\d{4}$/.test(s) ? s.slice(0,3) + "-" + s.slice(3) : s;
  }
  function placaOk(v) {
    var s = v.replace(/-/g, "");
    return /^[A-Z]{3}\d{4}$/.test(s) || /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(s);
  }
  function nomeOk(v) {
    var p = v.trim().split(/\s+/).filter(Boolean);
    return p.length >= 2 && p.every(function (x) { return x.length >= 2; }) && /^[A-Za-zÀ-ÿ'’. -]+$/.test(v.trim());
  }

  var data = {};
  function resetData() { data = { servicos: {}, outro: "", novo: "" }; }
  resetData();
  var stamp = null;

  function req(s) { return typeof s.req === "function" ? s.req() : s.req !== false; }
  function isNovo() { return data.novo === "sim"; }
  function plain(v) { return v.replace(/\s{2,}/g, " ").replace(/^\s+/, ""); }

  // type: "services" | "choice" | "text"
  var steps = [
    { key: "servicos", type: "services", label: "Serviço requisitado", title: "Quais serviços o cliente pediu?", hint: "Marque todos os que forem pedidos." },
    { key: "novo", type: "choice", label: "Cliente novo?", title: "O cliente é novo na loja?", hint: "Se for novo, preencha o cadastro completo nas próximas perguntas." },
    { key: "nome", label: "Nome completo", title: "Qual é o nome do cliente?", hint: "Nome e sobrenome, como está no documento.",
      format: plain, check: function (v) { return nomeOk(v) ? ok() : bad("Informe nome e sobrenome, só com letras."); } },
    { key: "cpf", label: "CPF", title: "Qual é o CPF do cliente?", hint: "Digite só os números. A pontuação entra sozinha.", mono: true, inputmode: "numeric", format: maskCPF,
      check: function (v) {
        var d = digits(v);
        if (d.length < 11) return pending("Faltam " + (11 - d.length) + " dígitos.");
        return validarCPF(v) ? ok("CPF válido.") : bad("CPF inválido. Confira os números.");
      } },
    { key: "chassi", label: "Chassi da moto", title: "Qual é o chassi da moto?", hint: "São 17 letras e números, sem espaços. As letras I, O e Q não existem em chassi.", mono: true, format: limparChassi,
      check: function (v) {
        if (v.length < 17) return pending(v.length + " de 17 caracteres.");
        if (/[IOQ]/.test(v)) return bad("Chassi não tem as letras I, O ou Q. Confira se não é 1 ou 0.");
        return /^[A-HJ-NPR-Z0-9]{17}$/.test(v) ? ok("Chassi completo.") : bad("Chassi inválido.");
      } },
    { key: "modelo", label: "Modelo/Ano", title: "Qual é o modelo e o ano da moto?", hint: "Exemplo: Jet 125 / 2024.", format: plain,
      check: function (v) { return v.trim().length >= 3 ? ok() : pending("Informe o modelo e o ano."); } },
    { key: "placa", label: "Placa", title: "Qual é a placa da moto?", hint: "Aceita placa antiga (ABC-1234) e Mercosul (ABC1D23).", mono: true, format: maskPlaca,
      check: function (v) { return placaOk(v) ? ok() : (v.length < 7 ? pending("Faltam caracteres.") : bad("Placa inválida.")); } },
    { key: "km", label: "KM", title: "Quantos quilômetros a moto tem?", hint: "Leia no painel. Se a moto for zero, digite 0.", mono: true, inputmode: "numeric", format: maskKM,
      check: function (v) { return v.length ? ok() : pending(""); } },
    { key: "celular", label: "Celular", title: "Qual é o celular do cliente?", hint: "Com DDD. Digite só os números.", mono: true, inputmode: "numeric", format: maskFone,
      check: function (v) {
        var d = digits(v);
        if (d.length < 11) return pending("Faltam " + (11 - d.length) + " dígitos.");
        return d[2] === "9" ? ok() : bad("Celular começa com 9 depois do DDD.");
      } },
    { key: "tel", label: "Telefone", title: "Qual é o telefone do cliente?", hint: "Telefone fixo ou de recado, com DDD.", mono: true, inputmode: "numeric", format: maskFone,
      check: function (v) { var n = digits(v).length; return n === 10 || n === 11 ? ok() : pending("Telefone incompleto."); } },
    { key: "rg", label: "RG", title: "Qual é o RG do cliente?", hint: "Pode digitar com ou sem pontos.", req: false, format: function (v) { return v.toUpperCase().replace(/[^0-9A-Z.\-\/ ]/g, "").slice(0, 20); },
      check: function (v) { return digits(v).length >= 5 ? ok() : pending("RG muito curto."); } },
    { key: "email", label: "E-mail", title: "Qual é o e-mail do cliente?", hint: "Exemplo: nome@email.com", req: false, format: function (v) { return v.trim().toLowerCase().replace(/\s/g, ""); },
      check: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? ok() : pending("Digite um e-mail completo."); } },
    { key: "endereco", label: "Endereço", title: "Qual é o endereço do cliente?", hint: "Rua, número e bairro.", req: false, format: plain,
      check: function (v) { return v.trim().length >= 6 ? ok() : pending("Endereço muito curto."); } },
    { key: "cidade", label: "Cidade/Estado", title: "Qual é a cidade e o estado?", hint: "Exemplo: São Luís/MA.", req: false, format: plain,
      check: function (v) { return v.trim().length >= 3 ? ok() : pending("Informe a cidade e o estado."); } },
    { key: "cep", label: "CEP", title: "Qual é o CEP?", hint: "Digite só os números.", mono: true, inputmode: "numeric", req: false, format: maskCEP,
      check: function (v) { var n = digits(v).length; return n === 8 ? ok() : pending("Faltam " + (8 - n) + " dígitos."); } }
  ];
  function ok(t) { return { ok: true, text: t || "" }; }
  function pending(t) { return { ok: false, text: t || "", tone: "" }; }
  function bad(t) { return { ok: false, text: t, tone: "bad" }; }

  // ---------- Estado da tela ----------
  var idx = 0, fromSheet = false;
  var $ = function (id) { return document.getElementById(id); };
  var nextBtn = $("next"), backBtn = $("back"), msg = $("msg"), bodyEl = $("body"), field = null;

  function stepValid(s) {
    if (s.type === "services") {
      var any = SERVICES.some(function (x) { return data.servicos[x.k]; });
      return any && (!data.servicos.outro || data.outro.trim().length > 0);
    }
    if (s.type === "choice") return data.novo === "sim" || data.novo === "nao";
    var v = data[s.key] || "";
    if (!v) return !req(s);
    return s.check(v).ok;
  }
  function firstInvalid() {
    for (var i = 0; i < steps.length; i++) if (!stepValid(steps[i])) return i;
    return -1;
  }

  function renderProgress() {
    var h = "";
    for (var i = 0; i < steps.length; i++) h += '<span class="' + (i <= idx ? "done" : "") + '"></span>';
    $("progress").innerHTML = h;
  }

  function showStep(i) {
    idx = i;
    var s = steps[i];
    $("stepPage").hidden = false;
    $("sheetPage").hidden = true;
    renderProgress();
    $("count").textContent = "Passo " + (i + 1) + " de " + steps.length;
    var tg = $("tag"), obrig = req(s); tg.hidden = false; tg.textContent = obrig ? "obrigatório" : "opcional"; tg.className = "tag" + (obrig ? " req" : "");
    $("title").textContent = s.title;
    $("hint").textContent = s.hint;
    bodyEl.innerHTML = "";
    field = null;
    if (s.type === "services") buildServices();
    else if (s.type === "choice") buildChoice();
    else buildText(s);
    backBtn.style.visibility = (i === 0 && !fromSheet) ? "hidden" : "visible";
    backBtn.textContent = fromSheet ? "Cancelar" : "Voltar";
    update();
    if (field) field.focus();
  }

  function buildText(s) {
    var lab = document.createElement("label");
    lab.className = "big"; lab.htmlFor = "field"; lab.textContent = s.label;
    field = document.createElement("input");
    field.type = "text"; field.id = "field"; field.autocomplete = "off"; field.spellcheck = false;
    if (s.mono) field.className = "mono";
    field.setAttribute("inputmode", s.inputmode || "text");
    if (s.key === "chassi" || s.key === "placa") field.setAttribute("autocapitalize", "characters");
    field.value = data[s.key] || "";
    bodyEl.appendChild(lab); bodyEl.appendChild(field);
    field.addEventListener("input", update);
    field.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); advance(); } });
  }

  function buildServices() {
    var wrap = document.createElement("div"); wrap.className = "opts";
    SERVICES.forEach(function (sv) {
      var l = document.createElement("label"); l.className = "opt" + (data.servicos[sv.k] ? " on" : "");
      var c = document.createElement("input"); c.type = "checkbox"; c.id = "sv_" + sv.k; c.checked = !!data.servicos[sv.k];
      var t = document.createElement("span"); t.textContent = sv.t;
      c.addEventListener("change", function () {
        data.servicos[sv.k] = c.checked; l.classList.toggle("on", c.checked);
        if (sv.k === "outro") { outroWrap.hidden = !c.checked; if (c.checked) outroIn.focus(); }
        update();
      });
      l.appendChild(c); l.appendChild(t); wrap.appendChild(l);
    });
    var outroWrap = document.createElement("div"); outroWrap.id = "outroWrap"; outroWrap.hidden = !data.servicos.outro;
    var outroIn = document.createElement("input"); outroIn.type = "text"; outroIn.id = "outroTxt";
    outroIn.placeholder = "Descreva o outro serviço"; outroIn.value = data.outro || ""; outroIn.autocomplete = "off";
    outroIn.addEventListener("input", function () { data.outro = plain(outroIn.value); update(); });
    outroIn.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); advance(); } });
    outroWrap.appendChild(outroIn);
    bodyEl.appendChild(wrap); bodyEl.appendChild(outroWrap);
  }

  function buildChoice() {
    var wrap = document.createElement("div"); wrap.className = "opts two";
    [["sim", "Sim, cliente novo"], ["nao", "Não, já é cliente"]].forEach(function (o) {
      var l = document.createElement("label"); l.className = "opt" + (data.novo === o[0] ? " on" : "");
      var r = document.createElement("input"); r.type = "radio"; r.name = "novo"; r.id = "novo_" + o[0]; r.checked = data.novo === o[0];
      var t = document.createElement("span"); t.textContent = o[1];
      r.addEventListener("change", function () {
        data.novo = o[0];
        Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove("on"); });
        l.classList.add("on"); update();
      });
      l.appendChild(r); l.appendChild(t); wrap.appendChild(l);
    });
    bodyEl.appendChild(wrap);
  }

  function update() {
    var s = steps[idx], r;
    if (s.type === "services") {
      r = stepValid(s) ? ok() : pending(SERVICES.some(function (x) { return data.servicos[x.k]; }) ? "Descreva o outro serviço." : "Marque pelo menos um serviço.");
      nextBtn.textContent = fromSheet ? "Salvar alteração" : "Avançar";
    } else if (s.type === "choice") {
      r = stepValid(s) ? ok() : pending("Escolha uma opção.");
      nextBtn.textContent = fromSheet ? "Salvar alteração" : "Avançar";
    } else {
      var v = s.format(field.value);
      if (v !== field.value) field.value = v;
      data[s.key] = v;
      if (!v) {
        r = req(s) ? pending("") : ok();
        nextBtn.textContent = req(s) ? (fromSheet ? "Salvar alteração" : "Avançar") : (fromSheet ? "Salvar sem preencher" : "Pular");
      } else {
        r = s.check(v);
        nextBtn.textContent = fromSheet ? "Salvar alteração" : (idx === steps.length - 1 ? "Gerar ordem de serviço" : "Avançar");
      }
      field.classList.toggle("invalid", r.tone === "bad");
    }
    if (!fromSheet && idx === steps.length - 1 && nextBtn.textContent === "Avançar") nextBtn.textContent = "Gerar ordem de serviço";
    nextBtn.disabled = !r.ok;
    msg.textContent = r.text || "";
    msg.className = "msg" + (r.ok && r.text ? " ok" : (r.tone === "bad" ? " bad" : ""));
  }

  function advance() {
    if (nextBtn.disabled) return;
    var s = steps[idx];
    if (s.type === "text") data[s.key] = field.value.trim();
    if (fromSheet) {
      var bad = firstInvalid();
      if (bad === -1) { fromSheet = false; showSheet(); } else showStep(bad);
      return;
    }
    if (idx < steps.length - 1) showStep(idx + 1);
    else { var b = firstInvalid(); if (b === -1) showSheet(); else showStep(b); }
  }

  // ---------- Folha ----------
  function mk(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function putText(g, key, value) {
    if (!value) return;
    var p = POS[key];
    var t = mk("text", { x: p.x, y: p.y, "font-size": p.size || 17 });
    if (p.ls) t.setAttribute("letter-spacing", p.ls);
    t.textContent = value;
    g.appendChild(t);
    t.__max = p.w;
  }
  function putX(g, cx, cy) {
    var r = 6.5;
    g.appendChild(mk("line", { x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r, stroke: "#0b1f4d", "stroke-width": 3, "stroke-linecap": "round" }));
    g.appendChild(mk("line", { x1: cx - r, y1: cy + r, x2: cx + r, y2: cy - r, stroke: "#0b1f4d", "stroke-width": 3, "stroke-linecap": "round" }));
  }
  function two(n) { return String(n).padStart(2, "0"); }

  function showSheet() {
    if (!stamp) {
      var n = new Date();
      stamp = { data: two(n.getDate()) + "/" + two(n.getMonth() + 1) + "/" + n.getFullYear(), hora: two(n.getHours()) + ":" + two(n.getMinutes()) };
    }
    var g = $("overlay");
    while (g.firstChild) g.removeChild(g.firstChild);
    SERVICES.forEach(function (sv) { if (data.servicos[sv.k]) putX(g, sv.x, sv.y); });
    if (data.servicos.outro) putText(g, "outro", data.outro);
    if (data.novo === "sim") putX(g, NOVO_BOX.x, NOVO_BOX.y);
    ["nome", "modelo", "chassi", "placa", "km", "tel", "celular", "endereco", "cidade", "cep", "rg", "cpf", "email"].forEach(function (k) { putText(g, k, data[k]); });
    putText(g, "data", stamp.data);
    putText(g, "hora", stamp.hora);

    $("stepPage").hidden = true;
    $("sheetPage").hidden = false;
    Array.prototype.forEach.call(g.querySelectorAll("text"), function (t) {
      try {
        if (t.getComputedTextLength() > t.__max) { t.setAttribute("textLength", t.__max); t.setAttribute("lengthAdjust", "spacingAndGlyphs"); }
      } catch (e) {}
    });
    document.title = "OS_" + (data.nome || "").replace(/\s+/g, "_") + "_" + (data.chassi || "");
    renderAnswers();
    window.scrollTo(0, 0);
  }

  function renderAnswers() {
    var ul = $("answers"); ul.innerHTML = "";
    steps.forEach(function (s, i) {
      var val;
      if (s.type === "services") {
        var names = SERVICES.filter(function (x) { return data.servicos[x.k]; }).map(function (x) { return x.k === "outro" ? "Outro: " + data.outro : x.t; });
        val = names.join(", ");
      } else if (s.type === "choice") val = data.novo === "sim" ? "Sim" : "Não";
      else val = data[s.key] || "(em branco)";
      var li = document.createElement("li");
      var box = document.createElement("div"); box.className = "txt";
      var k = document.createElement("div"); k.className = "k"; k.textContent = s.label;
      var v = document.createElement("div"); v.className = "v"; v.textContent = val;
      box.appendChild(k); box.appendChild(v);
      var b = document.createElement("button"); b.type = "button"; b.className = "ghost small"; b.textContent = "Editar";
      b.setAttribute("aria-label", "Editar " + s.label);
      b.addEventListener("click", function () { fromSheet = true; showStep(i); });
      li.appendChild(box); li.appendChild(b); ul.appendChild(li);
    });
  }

  nextBtn.addEventListener("click", advance);
  backBtn.addEventListener("click", function () {
    if (fromSheet) { fromSheet = false; showSheet(); return; }
    if (idx > 0) showStep(idx - 1);
  });
  $("printBtn").addEventListener("click", function () { window.print(); });
  $("newBtn").addEventListener("click", function () {
    resetData(); stamp = null; fromSheet = false;
    document.title = "O.S. Shineray Viana";
    showStep(0);
  });

  showStep(0);
})();
