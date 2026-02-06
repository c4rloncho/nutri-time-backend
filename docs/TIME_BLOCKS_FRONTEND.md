# Implementación de Time Blocks y Calendario en Frontend

Esta guía detalla cómo implementar la funcionalidad de bloqueo de tiempo y el calendario visual en el frontend.

---

## Resumen

Los **Time Blocks** permiten a los nutricionistas bloquear fechas u horarios específicos donde no estarán disponibles (vacaciones, reuniones, emergencias, etc.). Estos bloqueos tienen **precedencia** sobre la disponibilidad regular.

---

## Interfaces TypeScript

```typescript
// Entidad TimeBlock
interface TimeBlock {
  id: number;
  nutritionistId: number;
  date: string;           // "2025-03-15"
  startTime: string | null; // "09:00" o null si allDay
  endTime: string | null;   // "17:00" o null si allDay
  allDay: boolean;
  reason: string | null;
  isActive: boolean;
  createdAt: string;
}

// DTO para crear
interface CreateTimeBlockDto {
  date: string;             // Requerido - "YYYY-MM-DD"
  startTime?: string;       // Requerido si allDay es false - "HH:MM"
  endTime?: string;         // Requerido si allDay es false - "HH:MM"
  allDay?: boolean;         // Default: false
  reason?: string;          // Opcional - motivo del bloqueo
}

// DTO para actualizar
interface UpdateTimeBlockDto {
  date?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  reason?: string;
  isActive?: boolean;
}
```

---

## Endpoints API

Todos los endpoints requieren autenticación JWT.

### Crear bloqueo
```http
POST /availability/time-blocks
Authorization: Bearer {token}
Content-Type: application/json

{
  "date": "2025-03-15",
  "allDay": true,
  "reason": "Vacaciones"
}
```

**Respuesta exitosa (201):**
```json
{
  "id": 1,
  "nutritionistId": 5,
  "date": "2025-03-15",
  "startTime": null,
  "endTime": null,
  "allDay": true,
  "reason": "Vacaciones",
  "isActive": true,
  "createdAt": "2025-02-05T10:30:00.000Z"
}
```

### Obtener mis bloqueos
```http
GET /availability/time-blocks/my-blocks
Authorization: Bearer {token}
```

**Respuesta (200):**
```json
[
  {
    "id": 1,
    "date": "2025-03-15",
    "allDay": true,
    "reason": "Vacaciones",
    ...
  },
  {
    "id": 2,
    "date": "2025-03-20",
    "startTime": "13:00",
    "endTime": "15:00",
    "allDay": false,
    "reason": "Reunión médica",
    ...
  }
]
```

### Obtener bloqueos de un nutricionista (para pacientes)
```http
GET /availability/time-blocks/nutritionist/{nutritionistId}
Authorization: Bearer {token}
```

### Obtener un bloqueo específico
```http
GET /availability/time-blocks/{id}
Authorization: Bearer {token}
```

### Actualizar bloqueo
```http
PATCH /availability/time-blocks/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Vacaciones extendidas",
  "endTime": "18:00"
}
```

### Eliminar bloqueo (soft delete)
```http
DELETE /availability/time-blocks/{id}
Authorization: Bearer {token}
```

---

## Ejemplos de Uso

### 1. Bloquear un día completo
```typescript
const bloquearDiaCompleto = async (fecha: string, motivo?: string) => {
  const response = await fetch('/availability/time-blocks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: fecha,
      allDay: true,
      reason: motivo,
    }),
  });
  return response.json();
};

// Uso
await bloquearDiaCompleto('2025-03-15', 'Día festivo');
```

### 2. Bloquear un rango de horas
```typescript
const bloquearHoras = async (
  fecha: string,
  horaInicio: string,
  horaFin: string,
  motivo?: string
) => {
  const response = await fetch('/availability/time-blocks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: fecha,
      startTime: horaInicio,
      endTime: horaFin,
      allDay: false,
      reason: motivo,
    }),
  });
  return response.json();
};

// Uso
await bloquearHoras('2025-03-20', '12:00', '14:00', 'Almuerzo extendido');
```

### 3. Bloquear rango de fechas (vacaciones)
```typescript
const bloquearVacaciones = async (
  fechaInicio: string,
  fechaFin: string,
  motivo: string
) => {
  const fechas = generarRangoFechas(fechaInicio, fechaFin);

  const promesas = fechas.map(fecha =>
    fetch('/availability/time-blocks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: fecha,
        allDay: true,
        reason: motivo,
      }),
    })
  );

  return Promise.all(promesas);
};

// Helper para generar rango de fechas
const generarRangoFechas = (inicio: string, fin: string): string[] => {
  const fechas: string[] = [];
  const fechaActual = new Date(inicio);
  const fechaFinal = new Date(fin);

  while (fechaActual <= fechaFinal) {
    fechas.push(fechaActual.toISOString().split('T')[0]);
    fechaActual.setDate(fechaActual.getDate() + 1);
  }

  return fechas;
};

// Uso
await bloquearVacaciones('2025-12-20', '2025-12-31', 'Vacaciones de Navidad');
```

---

## Componentes UI Sugeridos

### 1. Modal de Bloqueo Rápido

```tsx
// Componente para crear bloqueos desde el calendario
interface BlockTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSuccess: () => void;
}

const BlockTimeModal = ({ isOpen, onClose, selectedDate, onSuccess }: BlockTimeModalProps) => {
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    const payload: CreateTimeBlockDto = {
      date: selectedDate,
      allDay,
      reason: reason || undefined,
    };

    if (!allDay) {
      payload.startTime = startTime;
      payload.endTime = endTime;
    }

    await createTimeBlock(payload);
    onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Bloquear tiempo - {selectedDate}</h2>

      <label>
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
        Todo el día
      </label>

      {!allDay && (
        <div>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      )}

      <input
        type="text"
        placeholder="Motivo (opcional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <button onClick={handleSubmit}>Bloquear</button>
    </Modal>
  );
};
```

### 2. Lista de Bloqueos

```tsx
const TimeBlocksList = () => {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);

  useEffect(() => {
    fetchMyTimeBlocks().then(setBlocks);
  }, []);

  const handleDelete = async (id: number) => {
    await deleteTimeBlock(id);
    setBlocks(blocks.filter(b => b.id !== id));
  };

  return (
    <div>
      <h2>Mis Bloqueos de Tiempo</h2>

      {blocks.length === 0 ? (
        <p>No tienes bloqueos programados</p>
      ) : (
        <ul>
          {blocks.map(block => (
            <li key={block.id}>
              <strong>{block.date}</strong>
              {block.allDay ? (
                <span> - Todo el día</span>
              ) : (
                <span> - {block.startTime} a {block.endTime}</span>
              )}
              {block.reason && <span> ({block.reason})</span>}
              <button onClick={() => handleDelete(block.id)}>Eliminar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### 3. Integración con Calendario

```tsx
// Mostrar bloqueos en el calendario
const Calendar = () => {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState([]);

  // Función para determinar el estado de un día
  const getDayStatus = (date: string) => {
    const block = timeBlocks.find(tb => tb.date === date);

    if (block?.allDay) {
      return 'blocked'; // Día completamente bloqueado
    }

    if (block) {
      return 'partially-blocked'; // Algunas horas bloqueadas
    }

    return 'available';
  };

  // Renderizar día del calendario
  const renderDay = (date: string) => {
    const status = getDayStatus(date);

    return (
      <div className={`calendar-day ${status}`}>
        {new Date(date).getDate()}
        {status === 'blocked' && <span>🔒</span>}
        {status === 'partially-blocked' && <span>⏰</span>}
      </div>
    );
  };

  // ...
};
```

---

## Validaciones Frontend

```typescript
// Validar antes de enviar
const validateTimeBlock = (data: CreateTimeBlockDto): string[] => {
  const errors: string[] = [];

  // Validar fecha
  if (!data.date) {
    errors.push('La fecha es requerida');
  } else {
    const fecha = new Date(data.date);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fecha < hoy) {
      errors.push('No puedes bloquear fechas pasadas');
    }
  }

  // Validar horarios si no es día completo
  if (!data.allDay) {
    if (!data.startTime || !data.endTime) {
      errors.push('Hora de inicio y fin son requeridas');
    } else if (data.startTime >= data.endTime) {
      errors.push('La hora de inicio debe ser anterior a la hora de fin');
    }
  }

  return errors;
};
```

---

## Estados de Error

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | "Start time must be before end time" | startTime >= endTime |
| 400 | "startTime and endTime are required when allDay is false" | Faltan horarios |
| 401 | Unauthorized | Token inválido o expirado |
| 403 | "Only nutritionists can create time blocks" | Usuario no es nutricionista |
| 403 | "You can only update your own time blocks" | Intentando modificar bloqueo ajeno |
| 404 | "Time block not found" | ID no existe |

---

## Flujo de Usuario Sugerido

### Para Nutricionistas:

1. **Ver calendario** → Mostrar días bloqueados con indicador visual
2. **Click en día** → Abrir modal con opciones:
   - "Bloquear todo el día"
   - "Bloquear horas específicas"
3. **Sección "Mis bloqueos"** → Lista de bloqueos con opción de editar/eliminar
4. **Bloqueo rápido de vacaciones** → Selector de rango de fechas

### Para Pacientes:

1. Al consultar slots disponibles (`GET /availability/slots`), los TimeBlocks **ya están considerados** en el backend
2. Los slots bloqueados **NO aparecerán** en la respuesta
3. Opcionalmente, mostrar días completamente bloqueados como "No disponible"

---

## Notas Importantes

1. **Los TimeBlocks tienen precedencia** sobre los AvailabilityBlocks regulares
2. **Soft delete**: Al eliminar un bloqueo, se marca `isActive: false` (no se borra de la BD)
3. **Sin validación de citas existentes**: Actualmente se puede crear un bloqueo aunque haya citas ese día. Considerar agregar validación o notificación al nutricionista
4. **Zona horaria**: Las fechas se manejan en formato ISO. Asegurar consistencia con el timezone del servidor
