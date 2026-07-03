from reportlab.pdfgen import canvas
try:
    c = canvas.Canvas('test_rupee.pdf')
    c.drawString(100, 100, '₹45,000.00')
    c.save()
    print('Success')
except Exception as e:
    print('Error:', e)
