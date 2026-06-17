(function () {
  var script = document.currentScript;
  var targetId = script && script.getAttribute("data-target");
  var target = targetId ? document.getElementById(targetId) : null;
  if (!target) {
    target = document.createElement("div");
    if (script && script.parentNode) script.parentNode.insertBefore(target, script);
    else document.body.appendChild(target);
  }

  var origin = (script && script.getAttribute("data-origin")) || new URL(script.src).origin;
  var path = (script && script.getAttribute("data-path")) || "/dashboard";
  var height = (script && script.getAttribute("data-height")) || "780";
  var language = (script && script.getAttribute("data-language")) || "en";
  var location = (script && script.getAttribute("data-location")) || "lokoja";
  var url = new URL(path, origin);
  url.searchParams.set("embed", "1");
  url.searchParams.set("lang", language);
  url.searchParams.set("location", location);

  var iframe = document.createElement("iframe");
  iframe.title = "KSEIP Environmental Intelligence Dashboard";
  iframe.src = url.toString();
  iframe.width = "100%";
  iframe.height = height;
  iframe.loading = "lazy";
  iframe.style.border = "0";
  iframe.style.borderRadius = "8px";
  iframe.style.background = "#f8fafc";
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  target.replaceChildren(iframe);
})();
