const fs = require('fs');

// 1. Update src/app/(app)/page.tsx
let pageCode = fs.readFileSync('src/app/(app)/page.tsx', 'utf8').replace(/\r\n/g, '\n');
const pageTarget = `      // Auto-redirect specialized industry verticals (e.g. Diagnostic Lab)
      const tenantRes = await fetch("/api/tenant");
      const tenantData = await tenantRes.json();
      if (tenantData.success && tenantData.tenant?.businessType === "DIAGNOSTIC_LAB") {
        router.replace("/lab");
        return;
      }`;

const pageReplacement = `      // Auto-redirect specialized industry verticals (e.g. Diagnostic Lab, Salon, Restaurant, Garage)
      const tenantRes = await fetch("/api/tenant");
      const tenantData = await tenantRes.json();
      if (tenantData.success) {
        const bType = tenantData.tenant?.businessType;
        if (bType === "DIAGNOSTIC_LAB") {
          router.replace("/lab");
          return;
        }
        if (bType === "SALON_SPA") {
          router.replace("/salon/appointments");
          return;
        }
        if (bType === "RESTAURANT") {
          router.replace("/restaurant");
          return;
        }
        if (bType === "AUTOMOBILE") {
          router.replace("/garage");
          return;
        }
      }`;

if (pageCode.includes(pageTarget)) {
  pageCode = pageCode.replace(pageTarget, pageReplacement);
  fs.writeFileSync('src/app/(app)/page.tsx', pageCode, 'utf8');
  console.log('src/app/(app)/page.tsx updated successfully');
} else {
  console.error('pageTarget not found in src/app/(app)/page.tsx');
}

// 2. Update src/app/login/page.tsx
let loginCode = fs.readFileSync('src/app/login/page.tsx', 'utf8').replace(/\r\n/g, '\n');
const loginTarget = `      } else if (
        data.user?.businessType === "DIAGNOSTIC_LAB" ||
        data.user?.tenantSlug === "demo-lab" ||
        email.toLowerCase().includes("lab.")
      ) {
        router.push("/lab");
      } else {
        router.push("/");
      }`;

const loginReplacement = `      } else if (
        data.user?.businessType === "DIAGNOSTIC_LAB" ||
        data.user?.tenantSlug === "demo-lab" ||
        email.toLowerCase().includes("lab.")
      ) {
        router.push("/lab");
      } else if (
        data.user?.businessType === "SALON_SPA" ||
        data.user?.tenantSlug === "demo-salon" ||
        email.toLowerCase().includes("salon.")
      ) {
        router.push("/salon/appointments");
      } else if (
        data.user?.businessType === "RESTAURANT" ||
        data.user?.tenantSlug === "demo-restaurant" ||
        email.toLowerCase().includes("restaurant.")
      ) {
        router.push("/restaurant");
      } else if (
        data.user?.businessType === "AUTOMOBILE" ||
        data.user?.tenantSlug === "demo-garage" ||
        email.toLowerCase().includes("garage.")
      ) {
        router.push("/garage");
      } else {
        router.push("/");
      }`;

if (loginCode.includes(loginTarget)) {
  loginCode = loginCode.replace(loginTarget, loginReplacement);
  fs.writeFileSync('src/app/login/page.tsx', loginCode, 'utf8');
  console.log('src/app/login/page.tsx updated successfully');
} else {
  console.error('loginTarget not found in src/app/login/page.tsx');
}

// 3. Update src/components/Sidebar.tsx
let sidebarCode = fs.readFileSync('src/components/Sidebar.tsx', 'utf8').replace(/\r\n/g, '\n');
const sidebarTarget = `            if (data.tenant?.businessType === "DIAGNOSTIC_LAB" || window.location.pathname.startsWith('/lab')) {
              setExpandedGroups((prev) => {
                const next = { ...prev, laboratory: true };
                savePersistedExpanded(next);
                return next;
              });
            }`;

const sidebarReplacement = `            const bType = data.tenant?.businessType;
            const pName = window.location.pathname;
            const nextExp = {};
            if (bType === "DIAGNOSTIC_LAB" || pName.startsWith('/lab')) nextExp.laboratory = true;
            if (bType === "SALON_SPA" || pName.startsWith('/salon')) nextExp.salon = true;
            if (bType === "RESTAURANT" || pName.startsWith('/restaurant')) nextExp.restaurant = true;
            if (bType === "AUTOMOBILE" || pName.startsWith('/garage')) nextExp.garage = true;
            if (Object.keys(nextExp).length > 0) {
              setExpandedGroups((prev) => {
                const merged = { ...prev, ...nextExp };
                savePersistedExpanded(merged);
                return merged;
              });
            }`;

if (sidebarCode.includes(sidebarTarget)) {
  sidebarCode = sidebarCode.replace(sidebarTarget, sidebarReplacement);
  fs.writeFileSync('src/components/Sidebar.tsx', sidebarCode, 'utf8');
  console.log('src/components/Sidebar.tsx updated successfully');
} else {
  console.error('sidebarTarget not found in src/components/Sidebar.tsx');
}
