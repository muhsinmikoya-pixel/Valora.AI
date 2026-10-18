import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({limit:"1mb"}));
app.use(express.static("public"));

const typo = {
  cheep:"cheap", cheepest:"cheapest", budjet:"budget", hotle:"hotel",
  htel:"hotel", restuarant:"restaurant", restraunt:"restaurant",
  resturant:"restaurant", piza:"pizza", pizzza:"pizza",
  burgar:"burger", playstaiton:"playstation", playstaion:"playstation",
  hedphones:"headphones", headfone:"headphones", wirless:"wireless"
};

function clean(s=""){
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ")
    .split(/\s+/).filter(Boolean).map(x=>typo[x]||x);
}

function haversine(a,b,c,d){
  if([a,b,c,d].some(v=>v==null)) return 999;
  const R=6371, rad=Math.PI/180;
  const x=(c-a)*rad, y=(d-b)*rad;
  const h=Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

async function nominatim(place){
  const u="https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(place);
  const r=await fetch(u,{headers:{"User-Agent":"Valora/1.0 contact: valora-local-app"}});
  if(!r.ok) throw new Error("geocoding failed");
  const j=await r.json();
  if(!j[0]) throw new Error("location not found");
  return {lat:Number(j[0].lat),lon:Number(j[0].lon),name:place};
}

async function places(lat,lon,category){
  const filter=category==="hotels"
    ? 'node["tourism"~"hotel|hostel"];way["tourism"~"hotel|hostel"];'
    : 'node["amenity"~"restaurant|cafe|fast_food"];way["amenity"~"restaurant|cafe|fast_food"];';
  const q=`[out:json];(${filter.replaceAll(";",`(around:10000,${lat},${lon});`)});out center tags;`;
  // The expression above is intentionally simple, but some Overpass servers
  // are picky. Use the explicit query if the generated one is rejected.
  const explicit=category==="hotels"
    ? `[out:json];(node["tourism"~"hotel|hostel"](around:10000,${lat},${lon});way["tourism"~"hotel|hostel"](around:10000,${lat},${lon}););out center tags;`
    : `[out:json];(node["amenity"~"restaurant|cafe|fast_food"](around:7000,${lat},${lon});way["amenity"~"restaurant|cafe|fast_food"](around:7000,${lat},${lon}););out center tags;`;
  const r=await fetch("https://overpass-api.de/api/interpreter",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:"data="+encodeURIComponent(explicit)
  });
  if(!r.ok) throw new Error("place search failed");
  const j=await r.json();
  return j.elements.map((e,i)=>{
    const t=e.tags||{}, la=e.lat??e.center?.lat, lo=e.lon??e.center?.lon;
    const km=haversine(lat,lon,la,lo);
    return {
      id:`place-${i}`, name:t.name||"Unnamed place",
      rating:t.stars||t.rating||null,
      distance:km<1?Math.round(km*1000)+" m":km.toFixed(1)+" km",
      km,lat:la,lon:lo,
      address:[t["addr:housenumber"],t["addr:street"],t["addr:city"]].filter(Boolean).join(" "),
      image: category==="hotels"
        ? "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=88"
        : "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=88",
      description:t.stars?`${t.stars}-star listing approximately ${km.toFixed(1)} km from your location.`:`Approximately ${km.toFixed(1)} km from your location.`,
      source:"OpenStreetMap / public place data"
    };
  }).sort((a,b)=>a.km-b.km).slice(0,20);
}

// Product data is deliberately separated from the UI.
// Replace/add retailer adapters here when you have a product API.
const catalog = [
  {id:"ps5",name:"PlayStation 5",brand:"Sony",image:"https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=88",rating:4.8,specs:[
    ["CPU","AMD Ryzen Zen 2, 8 cores / 16 threads"],["GPU","AMD Radeon RDNA-based graphics engine"],["Memory","16 GB GDDR6"],["Storage","1 TB custom SSD on current PS5 model"],["Video","Up to 4K/120 Hz on supported displays"],["Audio","Tempest 3D AudioTech"]
  ]},
  {id:"switch2",name:"Nintendo Switch 2",brand:"Nintendo",image:"https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=88",rating:4.7,specs:[
    ["Screen","7.9-inch LCD, 1920×1080, HDR10, VRR up to 120 Hz"],["Processor","Custom NVIDIA processor"],["Storage","256 GB UFS"],["Wireless","Wi-Fi 6 and Bluetooth"],["TV output","Up to 4K at 60 fps"],["Battery","Approx. 2–6.5 hours"]
  ]},
  {id:"xm5",name:"Sony WH-1000XM5",brand:"Sony",image:"https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=88",rating:4.8,specs:[
    ["Driver","30 mm dynamic driver"],["Weight","Approx. 250 g"],["Battery","Up to 30 hours with noise cancelling on"],["Bluetooth","Bluetooth 5.2"],["Audio","SBC, AAC, LDAC"],["Range","Approx. 10 m"]
  ]},
  {id:"airpods",name:"Apple AirPods Pro 3",brand:"Apple",image:"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=1200&q=88",rating:4.7,specs:[
    ["Chip","Apple H2 headphone chip"],["ANC","Active Noise Cancellation"],["Water resistance","IP57"],["Battery","Up to 8 hours listening with ANC"],["Bluetooth","Bluetooth 5.3"]
  ]},
  {id:"iphone17",name:"Apple iPhone 17",brand:"Apple",image:"https://images.unsplash.com/photo-1592286927505-2fd0d8fbbac1?auto=format&fit=crop&w=1200&q=88",rating:4.7,specs:[
    ["Type","Smartphone"],["Brand","Apple"],["Connectivity","5G / Wi-Fi / Bluetooth"],["Software","iOS"],["Price","Depends on storage and retailer"]
  ]}
];

app.get("/api/search", async (req,res)=>{
  try{
    const category=req.query.category||"shopping";
    const q=clean(req.query.q||"").join(" ");
    const priority=req.query.priority||"value";
    let lat=req.query.lat?Number(req.query.lat):null;
    let lon=req.query.lon?Number(req.query.lon):null;
    const place=(req.query.place||"").trim();

    if((lat==null||lon==null) && place && place.toLowerCase()!=="your location"){
      const g=await nominatim(place);lat=g.lat;lon=g.lon;
    }

    if(category==="shopping"){
      const terms=clean(q);
      let results=catalog.filter(p=>!terms.length || terms.some(t=>(p.name+" "+p.brand).toLowerCase().includes(t)));
      if(!results.length) results=catalog;
      results=results.map((p,i)=>({...p,score:(9.6-i*0.25).toFixed(1)+"/10",price:null,description:`${p.name} is a real product entry. Exact local retailer price and availability require a connected retailer/product API.`}));
      if(priority==="rating") results.sort((a,b)=>b.rating-a.rating);
      res.json({title:"Shopping picks",subtitle:`${results.length} product matches • specifications included`,results});
      return;
    }

    if(lat==null||lon==null) return res.status(400).json({error:"location_required"});
    let results=await places(lat,lon,category);
    if(priority==="rating") results.sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0));
    res.json({title:category==="hotels"?"Nearby hotels":"Nearby food",subtitle:`${results.length} nearby results • live public place data`,results});
  }catch(e){
    console.error(e);
    res.status(500).json({error:"search_failed",message:e.message});
  }
});

app.post("/api/ask", async (req,res)=>{
  const question=String(req.body?.question||"").trim();
  const context=Array.isArray(req.body?.context)?req.body.context.slice(0,8):[];
  if(!question) return res.status(400).json({error:"question_required"});

  // Optional real AI: any OpenAI-compatible endpoint can be used.
  // Without a key, Valora still gives grounded answers from the result data.
  if(process.env.AI_API_KEY && process.env.AI_API_URL){
    try{
      const r=await fetch(process.env.AI_API_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.AI_API_KEY}`},
        body:JSON.stringify({
          model:process.env.AI_MODEL||"gpt-4o-mini",
          messages:[
            {role:"system",content:"You are Valora, a shopping, hotel and food recommendation assistant. Use ONLY the supplied result context for factual claims. If price/availability is missing, say so. Explain technical specs simply. Never invent retailer prices."},
            {role:"user",content:`Question: ${question}\n\nResult context:\n${JSON.stringify(context,null,2)}`}
          ],
          temperature:0.2
        })
      });
      if(r.ok){
        const j=await r.json();
        const answer=j.choices?.[0]?.message?.content;
        if(answer) return res.json({answer});
      }
    }catch(e){console.error("AI provider error:",e.message)}
  }

  const p=context[0];
  if(!p) return res.json({answer:"I need a search result first. Search for a product, hotel or food place, then ask me about it."});
  const q=clean(question);
  if(p.specs && (q.includes("spec")||q.includes("detail"))){
    return res.json({answer:`Here are the main specs for ${p.name}: ${p.specs.map(x=>x[0]+": "+x[1]).join(" • ")}.`});
  }
  if(q.includes("pros")) return res.json({answer:`A main advantage of ${p.name} is that ${p.description||"it matches your search."} Its listed rating is ${p.rating||"not available"}.`});
  if(q.includes("cons")) return res.json({answer:`One limitation is that Valora does not have a live retailer price for ${p.name} yet, so I can't honestly say it is the cheapest deal.`});
  return res.json({answer:`${p.name}: ${p.description||"Valora found this as a relevant result."} Ask “what are the specs?”, “pros?”, “cons?”, or “compare it” for a focused answer.`});
});

app.listen(PORT,()=>console.log(`Valora running at http://localhost:${PORT}`));
