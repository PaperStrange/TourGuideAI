"use strict";(self.webpackChunktour_guide_ai=self.webpackChunktour_guide_ai||[]).push([[125],{125:(e,s,t)=>{t.r(s),t.d(s,{default:()=>o});var a=t(483),r=t(376),i=t(723);const c={user_id:"uid001",user_name:"TravelExplorer",user_profile:"https://randomuser.me/api/portraits/men/1.jpg"},d=[{user_profile:"https://randomuser.me/api/portraits/men/1.jpg",user_id:"uid001",user_route_id:"uid001-1",user_route_rank:1,created_date:"2025-01-01",upvotes:100,views:500,route_name:"A 3-day US travel plan",sites_included_in_routes:50,route_duration:"3 days",estimated_cost:"3000$"},{user_profile:"https://randomuser.me/api/portraits/men/1.jpg",user_id:"uid001",user_route_id:"uid001-2",user_route_rank:5,created_date:"2025-01-05",upvotes:75,views:320,route_name:"Weekend in Paris",sites_included_in_routes:15,route_duration:"2 days",estimated_cost:"2500$"},{user_profile:"https://randomuser.me/api/portraits/men/1.jpg",user_id:"uid001",user_route_id:"uid001-3",user_route_rank:12,created_date:"2025-01-10",upvotes:45,views:210,route_name:"Tokyo adventure",sites_included_in_routes:25,route_duration:"5 days",estimated_cost:"4500$"},{user_profile:"https://randomuser.me/api/portraits/men/1.jpg",user_id:"uid001",user_route_id:"uid001-4",user_route_rank:20,created_date:"2025-01-15",upvotes:30,views:150,route_name:"Rome historical tour",sites_included_in_routes:20,route_duration:"4 days",estimated_cost:"3500$"}],o=()=>{const e=(0,r.Zp)(),[s,t]=(0,a.useState)(c),[o,l]=(0,a.useState)(d),[n,u]=(0,a.useState)("created_date"),[m,_]=(0,a.useState)("desc"),p=e=>{n===e?_("asc"===m?"desc":"asc"):(u(e),_("desc"))},v=((e,s,t)=>(console.log(`Sorting routes by ${s} in ${t} order`),[...e].sort(((e,a)=>{let r=0;switch(s){case"created_date":r=new Date(e.created_date)-new Date(a.created_date);break;case"upvotes":r=e.upvotes-a.upvotes;break;case"views":r=e.views-a.views;break;case"sites":r=e.sites_included_in_routes-a.sites_included_in_routes;break;case"cost":r=parseFloat(e.estimated_cost)-parseFloat(a.estimated_cost);break;default:r=0}return"asc"===t?r:-r}))))(o,n,m);return(0,i.jsxs)("div",{className:"profile-page",children:[(0,i.jsx)("h1",{className:"page-title",children:"User Profile"}),(0,i.jsxs)("div",{className:"profile-container",children:[(0,i.jsxs)("div",{className:"profile-header",children:[(0,i.jsx)("h2",{className:"user-name",children:s.user_name}),(0,i.jsx)("div",{className:"profile-image-container",children:(0,i.jsx)("img",{src:s.user_profile,alt:s.user_name,className:"profile-image"})})]}),(0,i.jsxs)("div",{className:"routes-board",children:[(0,i.jsxs)("div",{className:"routes-header",children:[(0,i.jsx)("h2",{children:"Your Travel Routes"}),(0,i.jsxs)("div",{className:"sort-options",children:[(0,i.jsx)("span",{children:"Sort by:"}),(0,i.jsxs)("button",{className:"sort-btn "+("created_date"===n?"active":""),onClick:()=>p("created_date"),children:["Date ","created_date"===n&&("asc"===m?"\u2191":"\u2193")]}),(0,i.jsxs)("button",{className:"sort-btn "+("upvotes"===n?"active":""),onClick:()=>p("upvotes"),children:["Upvotes ","upvotes"===n&&("asc"===m?"\u2191":"\u2193")]}),(0,i.jsxs)("button",{className:"sort-btn "+("views"===n?"active":""),onClick:()=>p("views"),children:["Views ","views"===n&&("asc"===m?"\u2191":"\u2193")]}),(0,i.jsxs)("button",{className:"sort-btn "+("sites"===n?"active":""),onClick:()=>p("sites"),children:["Sites ","sites"===n&&("asc"===m?"\u2191":"\u2193")]}),(0,i.jsxs)("button",{className:"sort-btn "+("cost"===n?"active":""),onClick:()=>p("cost"),children:["Cost ","cost"===n&&("asc"===m?"\u2191":"\u2193")]})]})]}),(0,i.jsx)("div",{className:"routes-list",children:v.map((s=>{const t=(e=>(console.log("Calculating route statistics for:",e.route_name),{sites:e.sites_included_in_routes,duration:e.route_duration,cost:e.estimated_cost}))(s);return(0,i.jsxs)("div",{className:"route-card",onClick:()=>{return t=s.user_route_id,void e("/map",{state:{routeId:t}});var t},children:[(0,i.jsxs)("div",{className:"route-info",children:[(0,i.jsx)("h3",{className:"route-name",children:s.route_name}),(0,i.jsxs)("p",{className:"route-date",children:["Created: ",s.created_date]}),(0,i.jsxs)("div",{className:"route-stats",children:[(0,i.jsxs)("div",{className:"stat-item",children:[(0,i.jsx)("span",{className:"stat-label",children:"Duration:"}),(0,i.jsx)("span",{className:"stat-value",children:t.duration})]}),(0,i.jsxs)("div",{className:"stat-item",children:[(0,i.jsx)("span",{className:"stat-label",children:"Sites:"}),(0,i.jsx)("span",{className:"stat-value",children:t.sites})]}),(0,i.jsxs)("div",{className:"stat-item",children:[(0,i.jsx)("span",{className:"stat-label",children:"Est. Cost:"}),(0,i.jsx)("span",{className:"stat-value",children:t.cost})]})]})]}),(0,i.jsxs)("div",{className:"route-metrics",children:[(0,i.jsxs)("div",{className:"metric",children:[(0,i.jsx)("span",{className:"metric-value",children:s.upvotes}),(0,i.jsx)("span",{className:"metric-label",children:"Upvotes"})]}),(0,i.jsxs)("div",{className:"metric",children:[(0,i.jsx)("span",{className:"metric-value",children:s.views}),(0,i.jsx)("span",{className:"metric-label",children:"Views"})]}),(0,i.jsxs)("div",{className:"metric",children:[(0,i.jsxs)("span",{className:"metric-value",children:["#",s.user_route_rank]}),(0,i.jsx)("span",{className:"metric-label",children:"Rank"})]})]})]},s.user_route_id)}))})]})]})]})}}}]);
//# sourceMappingURL=125.598ad7c6.chunk.js.map