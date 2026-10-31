const fs = require('fs');

let code = fs.readFileSync('src/app/api/tenant/route.ts', 'utf8').replace(/\r\n/g, '\n');

// 1. Automobile
const autoTarget = `    // Industry-Specific Module: Only show Garage & Service for AUTOMOBILE businesses
    if (tenant.businessType === "AUTOMOBILE") {
      menuTree.push({
        id: "garage",
        name: "Garage & Service",
        icon: "Wrench",
        children: [
          {
            id: "job-cards",
            name: "Active Job Cards",
            href: "/garage",
            icon: "ClipboardCheck"
          }
        ]
      });
    }`;

const autoReplacement = `    // Industry-Specific Module: Show Garage & Service at TOP PRIORITY for AUTOMOBILE
    if (tenant.businessType === "AUTOMOBILE") {
      menuTree.unshift({
        id: "garage",
        name: "Garage & Automobile Workshop",
        icon: "Wrench",
        badge: "Live Fleet",
        badgeColor: "indigo",
        children: [
          {
            id: "job-cards",
            name: "Active Job Cards & Repairs",
            href: "/garage",
            icon: "ClipboardCheck",
            highlight: true,
          },
          {
            id: "new-job-card",
            name: "+ New Vehicle Inward",
            href: "/garage/new",
            icon: "PlusCircle",
          },
        ]
      });
    }`;

// 2. Salon
const salonTarget = `    // Industry-Specific Module: Only show Salon, Spa & Wellness for SALON_SPA businesses
    if (tenant.businessType === "SALON_SPA") {
      menuTree.splice(2, 0, {
        id: "salon",
        name: "Salon & Wellness",
        icon: "Scissors",
        badge: "Live Slots",
        badgeColor: "emerald",
        children: [
          {
            id: "salon-appointments",
            name: "Appointment & Chair Slots",
            href: "/salon/appointments",
            icon: "Calendar",
            badge: "Live Slots",
            badgeColor: "emerald",
            highlight: true,
          },
        ],
      });
    }`;

const salonReplacement = `    // Industry-Specific Module: Show Salon, Spa & Wellness at TOP PRIORITY for SALON_SPA
    if (tenant.businessType === "SALON_SPA") {
      menuTree.unshift({
        id: "salon",
        name: "Salon, Spa & Wellness",
        icon: "Scissors",
        badge: "Live Chairs",
        badgeColor: "emerald",
        children: [
          {
            id: "salon-appointments",
            name: "Appointments & Chair Slots",
            href: "/salon/appointments",
            icon: "Calendar",
            badge: "Live Chairs",
            badgeColor: "emerald",
            highlight: true,
          },
          {
            id: "salon-booking-portal",
            name: "Public Booking Portal",
            href: \`/book/\${tenant.slug}\`,
            icon: "Sparkles",
            badge: "Online QR",
            badgeColor: "indigo",
          },
          {
            id: "salon-services",
            name: "Salon Services & Rates",
            href: "/inventory",
            icon: "Tag",
          },
        ],
      });
    }`;

// 3. Restaurant
const restTarget = `    // Industry-Specific Module: Only show Food & Restaurant for RESTAURANT businesses
    if (tenant.businessType === "RESTAURANT") {
      menuTree.splice(2, 0, {
        id: "restaurant",
        name: "Food & Restaurant",
        icon: "UtensilsCrossed",
        badge: occupiedTablesCount > 0 ? \`\${occupiedTablesCount} Busy\` : undefined,
        badgeColor: "amber",
        children: [
          { 
            id: "tables", 
            name: "Dining Tables & Status", 
            href: "/restaurant", 
            icon: "Layers",
            badge: occupiedTablesCount > 0 ? \`\${occupiedTablesCount}\` : undefined,
            badgeColor: "amber"
          },
          { 
            id: "kot", 
            name: "Kitchen Order Tickets (KOT)", 
            href: "/restaurant", 
            icon: "ChefHat" 
          },
          {
            id: "reservations",
            name: "Reservations & Waitlist",
            href: "/restaurant/reservations",
            icon: "Calendar",
          },
          ...(userRole === "OWNER" || userRole === "MANAGER"
            ? [{
                id: "fnb-report",
                name: "Daily F&B Sales Report",
                href: "/restaurant/report",
                icon: "Calculator",
                badge: "Daily",
                badgeColor: "emerald" as const,
              }]
            : []),
        ],
      });
    }`;

const restReplacement = `    // Industry-Specific Module: Show Food & Restaurant at TOP PRIORITY for RESTAURANT
    if (tenant.businessType === "RESTAURANT") {
      menuTree.unshift({
        id: "restaurant",
        name: "Food & Restaurant",
        icon: "UtensilsCrossed",
        badge: occupiedTablesCount > 0 ? \`\${occupiedTablesCount} Busy\` : "Tables",
        badgeColor: "amber",
        children: [
          { 
            id: "tables", 
            name: "Dining Tables & Status", 
            href: "/restaurant", 
            icon: "Layers",
            badge: occupiedTablesCount > 0 ? \`\${occupiedTablesCount}\` : undefined,
            badgeColor: "amber"
          },
          { 
            id: "kot", 
            name: "Kitchen Order Tickets (KOT)", 
            href: "/restaurant", 
            icon: "ChefHat" 
          },
          {
            id: "reservations",
            name: "Reservations & Waitlist",
            href: "/restaurant/reservations",
            icon: "Calendar",
          },
          ...(userRole === "OWNER" || userRole === "MANAGER"
            ? [{
                id: "fnb-report",
                name: "Daily F&B Sales Report",
                href: "/restaurant/report",
                icon: "Calculator",
                badge: "Daily",
                badgeColor: "emerald" as const,
              }]
            : []),
        ],
      });
    }`;

let updated = 0;
if (code.includes(autoTarget)) {
  code = code.replace(autoTarget, autoReplacement);
  updated++;
  console.log('Automobile menu updated');
} else {
  console.log('Automobile menu target not found');
}

if (code.includes(salonTarget)) {
  code = code.replace(salonTarget, salonReplacement);
  updated++;
  console.log('Salon menu updated');
} else {
  console.log('Salon menu target not found');
}

if (code.includes(restTarget)) {
  code = code.replace(restTarget, restReplacement);
  updated++;
  console.log('Restaurant menu updated');
} else {
  console.log('Restaurant menu target not found');
}

if (updated > 0) {
  fs.writeFileSync('src/app/api/tenant/route.ts', code, 'utf8');
  console.log(`Saved ${updated} menu priority updates in src/app/api/tenant/route.ts`);
}
