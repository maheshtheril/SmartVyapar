import sys

file = 'src/app/(app)/billing/new/page.tsx'
with open(file, 'r', encoding='utf8') as f:
    content = f.read()

content = content.replace('const handleResetNewSale = () => {', 'const handleResetNewSale = (keepModalOpen?: boolean) => {')

target1 = '''      ]);
    setShowReceiptModal(false);
    setReceiptData(null);
  };'''

replacement1 = '''      ]);
    if (keepModalOpen !== true) {
      setShowReceiptModal(false);
      setReceiptData(null);
    }
  };'''

content = content.replace(target1, replacement1)

target_off = '''        setShowReceiptModal(true);
        setIsPaymentModalOpen(false);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      try {'''

replacement_off = '''        handleResetNewSale(true);
        setShowReceiptModal(true);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      try {'''

content = content.replace(target_off, replacement_off)


target_try = '''        setShowReceiptModal(true);
        setIsPaymentModalOpen(false);
      } catch (err: any) {'''

replacement_try = '''        handleResetNewSale(true);
        setShowReceiptModal(true);
      } catch (err: any) {'''

content = content.replace(target_try, replacement_try)


target_catch = '''            setShowReceiptModal(true);
            setIsPaymentModalOpen(false);
            return;
          } catch (enqueueErr) {'''

replacement_catch = '''            handleResetNewSale(true);
            setShowReceiptModal(true);
            return;
          } catch (enqueueErr) {'''

content = content.replace(target_catch, replacement_catch)

with open(file, 'w', encoding='utf8') as f:
    f.write(content)
