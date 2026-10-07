const fs = require('fs');
const file = 'src/app/(app)/billing/new/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('const handleResetNewSale = () => {', 'const handleResetNewSale = (keepModalOpen?: boolean) => {');

const target1 =       ]);\r\n    setShowReceiptModal(false);\r\n    setReceiptData(null);\r\n  };;
const replacement1 =       ]);\r\n    if (keepModalOpen !== true) {\r\n      setShowReceiptModal(false);\r\n      setReceiptData(null);\r\n    }\r\n  };;
content = content.replace(target1, replacement1);

const target_off =         setShowReceiptModal(true);\r\n        setIsPaymentModalOpen(false);\r\n        setIsSubmitting(false);\r\n        isSubmittingRef.current = false;\r\n        return;\r\n      }\r\n\r\n      try {;
const replacement_off =         handleResetNewSale(true);\r\n        setShowReceiptModal(true);\r\n        setIsSubmitting(false);\r\n        isSubmittingRef.current = false;\r\n        return;\r\n      }\r\n\r\n      try {;
content = content.replace(target_off, replacement_off);

const target_try =         setShowReceiptModal(true);\r\n        setIsPaymentModalOpen(false);\r\n      } catch (err: any) {;
const replacement_try =         handleResetNewSale(true);\r\n        setShowReceiptModal(true);\r\n      } catch (err: any) {;
content = content.replace(target_try, replacement_try);

const target_catch =             setShowReceiptModal(true);\r\n            setIsPaymentModalOpen(false);\r\n            return;\r\n          } catch (enqueueErr) {;
const replacement_catch =             handleResetNewSale(true);\r\n            setShowReceiptModal(true);\r\n            return;\r\n          } catch (enqueueErr) {;
content = content.replace(target_catch, replacement_catch);

// Just in case it's LF instead of CRLF
content = content.replace(      ]);\n    setShowReceiptModal(false);\n    setReceiptData(null);\n  };,       ]);\n    if (keepModalOpen !== true) {\n      setShowReceiptModal(false);\n      setReceiptData(null);\n    }\n  };);
content = content.replace(        setShowReceiptModal(true);\n        setIsPaymentModalOpen(false);\n        setIsSubmitting(false);\n          isSubmittingRef.current = false;\n        return;\n      }\n\n      try {,         handleResetNewSale(true);\n        setShowReceiptModal(true);\n        setIsSubmitting(false);\n          isSubmittingRef.current = false;\n        return;\n      }\n\n      try {);
content = content.replace(        setShowReceiptModal(true);\n        setIsPaymentModalOpen(false);\n      } catch (err: any) {,         handleResetNewSale(true);\n        setShowReceiptModal(true);\n      } catch (err: any) {);
content = content.replace(            setShowReceiptModal(true);\n            setIsPaymentModalOpen(false);\n            return;\n          } catch (enqueueErr) {,             handleResetNewSale(true);\n            setShowReceiptModal(true);\n            return;\n          } catch (enqueueErr) {);

fs.writeFileSync(file, content, 'utf8');
