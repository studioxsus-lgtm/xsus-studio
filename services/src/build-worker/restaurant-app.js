const menu = [
  {name:"Margherita", detail:"Domate, mocarela dhe borzilok", cents:850},
  {name:"Penne al pesto", detail:"Pesto borziloku dhe parmixhan", cents:1050},
  {name:"Sallatë greke", detail:"Feta, ullinj dhe kastravec", cents:650},
  {name:"Tiramisu", detail:"Maskarpone, kafe dhe kakao", cents:450}
];

export function restaurantPreview() {
  const html = `<!doctype html><html lang="sq"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Restoranti</title><link rel="stylesheet" href="./styles.css"></head><body><main>
<section id="menu"><h1>Menuja</h1><div id="dishes" class="grid"></div></section>
<section id="cart" hidden><h1>Porosia</h1><div id="lines"></div><p id="total"></p><button id="confirm">Konfirmo porosinë</button></section>
<section id="history" hidden><h1>Historiku</h1><div id="orders"></div></section>
<p id="status" role="status"></p><nav aria-label="Faqet"><button data-page="menu">Menuja</button><button data-page="cart">Porosia</button><button data-page="history">Historiku</button></nav>
</main><script src="./main.js"></script></body></html>`;
  const css = `:root{font:16px/1.5 system-ui,sans-serif;color:#232e27;background:#f8f6ef;--green:#20503c}*{box-sizing:border-box}body{margin:0}main{max-width:50rem;margin:auto;padding:1.25rem 1.15rem 7rem}h1,h2{font-family:Georgia,serif}h1{font-size:clamp(2.5rem,8vw,4.8rem);line-height:1.05;margin:1.5rem 0}h2{margin:0;font-size:1.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));gap:.85rem}article{background:#fffdf7;border:1px solid #d7d8c8;border-radius:1.25rem;padding:1.2rem;margin-bottom:.6rem}article p{color:#48554a}.row,nav{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap}.row{justify-content:space-between}button{min-height:44px;min-width:44px;padding:.55rem 1rem;border:0;border-radius:2rem;background:var(--green);color:white;font:inherit;font-weight:600;cursor:pointer}button:disabled{opacity:.5}nav{position:fixed;left:50%;bottom:max(.75rem,env(safe-area-inset-bottom));transform:translateX(-50%);background:#fffdf7;border:1px solid #c8cbbe;padding:.35rem;flex-wrap:nowrap;border-radius:2rem;box-shadow:0 4px 20px #21372822}nav button{color:#284234;background:transparent;padding:.55rem .8rem}nav [aria-current=page]{color:white;background:var(--green)}#total{font-size:1.35rem;font-weight:700}[hidden]{display:none!important}:focus-visible{outline:3px solid #ae691e;outline-offset:2px}`;
  return [{path:"index.html",content:html},{path:"styles.css",content:css},{path:"main.js",content:"("+runRestaurant.toString()+")("+JSON.stringify(menu)+");"}];
}

function runRestaurant(menu) {
  const el = id => document.getElementById(id);
  const make = (tag,text) => { const node=document.createElement(tag); node.textContent=text; return node; };
  const money = cents => (cents / 100).toFixed(2) + " €";
  const key = "xsus-restaurant-v1:" + location.pathname;
  let state = {cart:menu.map(()=>0),orders:[]}, ready = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved !== null) {
      if (!Array.isArray(saved.cart) || saved.cart.length !== menu.length || !saved.cart.every(n=>Number.isInteger(n)&&n>=0&&n<=99) || !Array.isArray(saved.orders) || !saved.orders.every(o=>typeof o==="string")) throw Error();
      state=saved;
    }
  } catch { ready=false; el("status").textContent="Të dhënat lokale nuk u lexuan."; }
  function save(next) {
    if (!ready) return false;
    try { localStorage.setItem(key,JSON.stringify(next)); state=next; render(); return true; }
    catch { el("status").textContent="Porosia nuk u ruajt. Provo përsëri."; return false; }
  }
  function change(index,delta) {
    const cart=state.cart.slice(); cart[index]=Math.max(0,Math.min(99,cart[index]+delta));
    if(save({...state,cart})) el("status").textContent=menu[index].name+" × "+cart[index];
  }
  function button(text,label,action,disabled=false) {
    const b=make("button",text); b.type="button"; b.setAttribute("aria-label",label); b.onclick=action; b.disabled=disabled||!ready; return b;
  }
  function show(page) {
    for(const id of ["menu","cart","history"]) el(id).hidden=id!==page;
    document.querySelectorAll("[data-page]").forEach(b=>{if(b.dataset.page===page)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
    const heading=el(page).querySelector("h1");heading.tabIndex=-1;heading.focus();
  }
  const total=()=>menu.reduce((sum,d,i)=>sum+d.cents*state.cart[i],0);
  function render() {
    const dishes=el("dishes"),lines=el("lines"),history=el("orders");
    dishes.replaceChildren();lines.replaceChildren();history.replaceChildren();
    menu.forEach((d,i)=>{
      const card=make("article",""),row=make("div","");row.className="row";
      row.append(make("strong",money(d.cents)),button("Shto","Shto "+d.name,()=>change(i,1),state.cart[i]>=99));
      card.append(make("h2",d.name),make("p",d.detail),row);dishes.append(card);
      if(!state.cart[i])return;
      const line=make("article",""),controls=make("div","");controls.className="row";
      controls.append(button("−","Hiq një "+d.name,()=>change(i,-1)),make("span","Sasia: "+state.cart[i]),button("+","Shto një "+d.name,()=>change(i,1),state.cart[i]>=99));
      line.append(make("h2",d.name),make("p",money(d.cents*state.cart[i])),controls);lines.append(line);
    });
    if(!total())lines.append(make("p","Porosia është bosh."));
    el("total").textContent="Totali: "+money(total());el("confirm").disabled=!ready||!total();
    if(!state.orders.length)history.append(make("p","Ende nuk ka porosi të konfirmuara."));
    else state.orders.slice().reverse().forEach(order=>history.append(make("article",order)));
  }
  el("confirm").onclick=()=>{
    if(!total())return;
    const receipt=menu.flatMap((d,i)=>state.cart[i]?[d.name+" × "+state.cart[i]]:[]).join(", ")+" · "+money(total());
    if(save({cart:menu.map(()=>0),orders:[...state.orders.slice(-99),receipt]})){show("history");el("status").textContent="Porosia u ruajt.";}
  };
  document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>show(b.dataset.page));
  render();show("menu");
}

export function restaurantScreen(pkg) {
  const dishes = menu.map(d=>"Dish("+JSON.stringify(d.name)+", "+JSON.stringify(d.detail)+", "+d.cents+")").join(",\n    ");
  return `package ${pkg}.ui

import android.util.AtomicFile
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import java.io.File
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject

private data class Dish(val name: String, val detail: String, val cents: Int)
private val dishes = listOf(
    ${dishes}
)
private fun money(cents: Int) = String.format(Locale.ROOT, "%.2f €", cents / 100.0)
private data class Orders(val cart: List<Int> = dishes.map { 0 }, val history: List<String> = emptyList())
private class OrderStore(private val file: AtomicFile) {
    fun load(): Orders {
        if (!file.baseFile.exists() && !File(file.baseFile.path + ".bak").exists()) return Orders()
        val json = JSONObject(file.openRead().bufferedReader().use { it.readText() })
        val cart = json.getJSONArray("cart")
        val orders = json.getJSONArray("history")
        require(cart.length() == dishes.size && orders.length() <= 100)
        return Orders(dishes.indices.map { cart.getInt(it).also { n -> require(n in 0..99) } },
            (0 until orders.length()).map { orders.getString(it) })
    }
    fun save(state: Orders) {
        val bytes = JSONObject().put("cart", JSONArray(state.cart)).put("history", JSONArray(state.history)).toString().toByteArray()
        val stream = file.startWrite()
        try { stream.write(bytes); file.finishWrite(stream) }
        catch (e: Exception) { file.failWrite(stream); throw e }
    }
}

@Composable
fun AppScreen() {
    val context = LocalContext.current
    val store = remember(context) { OrderStore(AtomicFile(File(context.filesDir, "restaurant-v1.json"))) }
    val loaded = remember(store) { runCatching { store.load() } }
    var state by remember(store) { mutableStateOf(loaded.getOrDefault(Orders())) }
    var status by remember { mutableStateOf(if (loaded.isFailure) "Të dhënat lokale nuk u lexuan." else "") }
    var page by rememberSaveable { mutableStateOf(0) }
    val pages = listOf("Menuja", "Porosia", "Historiku")
    val total = dishes.indices.sumOf { dishes[it].cents * state.cart[it] }
    fun save(next: Orders): Boolean {
        if (loaded.isFailure) return false
        return runCatching { store.save(next) }.fold({ state = next; true }, { status = "Porosia nuk u ruajt."; false })
    }
    fun change(i: Int, delta: Int) {
        val cart = state.cart.toMutableList()
        cart[i] = (cart[i] + delta).coerceIn(0, 99)
        if (save(state.copy(cart = cart))) status = dishes[i].name + " × " + cart[i]
    }
    BackHandler(enabled = page != 0) { page = 0 }
    Scaffold(bottomBar = {
        NavigationBar {
            pages.forEachIndexed { i, label -> NavigationBarItem(
                selected = page == i, onClick = { page = i }, icon = { Text(listOf("☰","＋","◷")[i]) }, label = { Text(label) }) }
        }
    }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding),contentPadding = PaddingValues(20.dp),verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Text(pages[page], style = MaterialTheme.typography.headlineLarge) }
            if (status.isNotEmpty()) item { Text(status, style = MaterialTheme.typography.bodySmall) }
            if (page == 0 || page == 1) {
                items(dishes.indices.filter { page == 0 || state.cart[it] > 0 }) { i ->
                    val d = dishes[i]
                    ElevatedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(18.dp),verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(d.name, style = MaterialTheme.typography.titleLarge)
                            Text(if (page == 0) d.detail else "Sasia: " + state.cart[i])
                            Text(money(d.cents * if (page == 0) 1 else state.cart[i]))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (page == 1) OutlinedButton(enabled = loaded.isSuccess,onClick = { change(i,-1) }) { Text("Hiq") }
                                Button(enabled = loaded.isSuccess && state.cart[i] < 99,onClick = { change(i,1) }) { Text("Shto") }
                            }
                        }
                    }
                }
            }
            if (page == 1) item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (total == 0) Text("Porosia është bosh.")
                    Text("Totali: " + money(total),style = MaterialTheme.typography.titleLarge)
                    Button(enabled = loaded.isSuccess && total > 0, onClick = {
                        val receipt = dishes.indices.filter { state.cart[it] > 0 }.joinToString(", ") { dishes[it].name + " × " + state.cart[it] } + " · " + money(total)
                        if (save(Orders(history = state.history.takeLast(99) + receipt))) { page = 2; status = "Porosia u ruajt." }
                    }) { Text("Konfirmo porosinë") }
                }
            }
            if (page == 2) {
                if (state.history.isEmpty()) item { Text("Ende nuk ka porosi të konfirmuara.") }
                items(state.history.asReversed()) { receipt ->
                    ElevatedCard(Modifier.fillMaxWidth()) { Text(receipt,Modifier.padding(18.dp)) }
                }
            }
        }
    }
}
`;
}
