#!/usr/bin/env python3
import os

# Configurar variables de entorno
os.environ['tvusername'] = 'apidev7loper@gmail.com'
os.environ['tvpassword'] = '!jBmb(+1+LSH-aJ\'h;cB'

print("🚀 Probando TradingView Access Management")
print("=" * 50)

try:
    import tradingview

    print("✅ Módulos importados correctamente")

    # Crear instancia
    print("🔄 Inicializando clase tradingview...")
    tv = tradingview.tradingview()
    print("✅ Clase inicializada")

    # Probar validación de usuario
    print("🔍 Probando validación de usuario...")
    username_to_test = 'apidev7loper@gmail.com'
    result = tv.validate_username(username_to_test)
    print(f"Resultado de validación para '{username_to_test}': {result}")

    print("✅ ¡Proyecto funcionando correctamente!")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
