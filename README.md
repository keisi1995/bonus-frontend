# Bonos de desempeño: frontend (Angular 22)

Pantalla `/bonuses`: listado de bonos paginado desde el servidor, con filtros (área, número de empleado, periodo y estado), acciones por fila (anular, eliminar, pagar) y un modal para registrar un bono con vista previa del cálculo.

Las instrucciones para levantar todo el sistema (base de datos, API y front), las decisiones técnicas y lo pendiente están en el **README del repositorio del backend**.

```bash
yarn install
yarn start        # http://localhost:4200 (la API debe correr en http://localhost:5106)
yarn build
```

## Estructura

```
src/app/
  core/
    interceptors/api-interceptor.ts   header UserCode + aviso de errores 409 (proyecto base)
    models/bonus.ts                   tipos del módulo de bonos
    services/bonus-api.ts             cliente HTTP de /api/v1/Bonus
    utils/bonus-calculator.ts         cálculo de la vista previa (mismo redondeo que el backend)
  features/bonuses/
    bonuses.*                         filtros, tabla, paginación y acciones
    bonus-form-modal/                 modal de registro
```
