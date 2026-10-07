
const fs = require("fs");
const file = "src/app/(app)/billing/new/page.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.replace("const handleResetNewSale = () => {", "const handleResetNewSale = (keepModalOpen?: boolean) => {");

const target1 = "      ]);\n    setShowReceiptModal(false);\n    setReceiptData(null);\n  };";
const replacement1 = "      ]);\n    if (keepModalOpen !== true) {\n      setShowReceiptModal(false);\n      setReceiptData(null);\n    }\n  };";
content = content.replace(target1, replacement1);
content = content.replace(target1.replace(/\n/g, "\r\n"), replacement1.replace(/\n/g, "\r\n"));

const t2 = "        setShowReceiptModal(true);\n        setIsPaymentModalOpen(false);\n        setIsSubmitting(false);\n          isSubmittingRef.current = false;\n        return;\n      }\n\n      try {";
const r2 = "        handleResetNewSale(true);\n        setShowReceiptModal(true);\n        setIsSubmitting(false);\n          isSubmittingRef.current = false;\n        return;\n      }\n\n      try {";
content = content.replace(t2, r2);
content = content.replace(t2.replace(/\n/g, "\r\n"), r2.replace(/\n/g, "\r\n"));

const t3 = "        setShowReceiptModal(true);\n        setIsPaymentModalOpen(false);\n      } catch (err: any) {";
const r3 = "        handleResetNewSale(true);\n        setShowReceiptModal(true);\n      } catch (err: any) {";
content = content.replace(t3, r3);
content = content.replace(t3.replace(/\n/g, "\r\n"), r3.replace(/\n/g, "\r\n"));

const t4 = "            setShowReceiptModal(true);\n            setIsPaymentModalOpen(false);\n            return;\n          } catch (enqueueErr) {";
const r4 = "            handleResetNewSale(true);\n            setShowReceiptModal(true);\n            return;\n          } catch (enqueueErr) {";
content = content.replace(t4, r4);
content = content.replace(t4.replace(/\n/g, "\r\n"), r4.replace(/\n/g, "\r\n"));

fs.writeFileSync(file, content, "utf8");

