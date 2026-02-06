# Calendario de Disponibilidad - Implementación Frontend

## Endpoint

```
GET /availability/calendar?nutritionistId={id}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}
```

**Ejemplo:**
```
GET /availability/calendar?nutritionistId=5&startDate=2025-03-01&endDate=2025-03-31
```

---

## Interfaces TypeScript

```typescript
type SlotStatus = 'available' | 'booked' | 'blocked';

interface SlotInfo {
  time: string;        // "09:00"
  status: SlotStatus;
  reason?: string;     // Solo si status es 'blocked'
}

interface DayCalendar {
  date: string;              // "2025-03-15"
  dayOfWeek: string;         // "SATURDAY"
  isWorkDay: boolean;        // true si el nutricionista trabaja ese día
  isFullDayBlocked: boolean; // true si todo el día está bloqueado
  blockReason?: string;      // Motivo del bloqueo si isFullDayBlocked
  slots: SlotInfo[];         // Array vacío si !isWorkDay o isFullDayBlocked
}

interface CalendarResponse {
  nutritionistId: number;
  startDate: string;
  endDate: string;
  days: DayCalendar[];
}
```

---

## Respuesta de Ejemplo

```json
{
  "nutritionistId": 5,
  "startDate": "2025-03-01",
  "endDate": "2025-03-03",
  "days": [
    {
      "date": "2025-03-01",
      "dayOfWeek": "SATURDAY",
      "isWorkDay": false,
      "isFullDayBlocked": false,
      "slots": []
    },
    {
      "date": "2025-03-02",
      "dayOfWeek": "SUNDAY",
      "isWorkDay": false,
      "isFullDayBlocked": false,
      "slots": []
    },
    {
      "date": "2025-03-03",
      "dayOfWeek": "MONDAY",
      "isWorkDay": true,
      "isFullDayBlocked": false,
      "slots": [
        { "time": "09:00", "status": "booked" },
        { "time": "10:00", "status": "available" },
        { "time": "11:00", "status": "blocked", "reason": "Reunión" },
        { "time": "12:00", "status": "available" },
        { "time": "13:00", "status": "booked" },
        { "time": "14:00", "status": "available" },
        { "time": "15:00", "status": "available" },
        { "time": "16:00", "status": "blocked", "reason": "Reunión" }
      ]
    }
  ]
}
```

---

## Lógica de Implementación

### 1. Servicio API

```typescript
const getCalendar = async (
  nutritionistId: number,
  startDate: string,
  endDate: string
): Promise<CalendarResponse> => {
  const response = await fetch(
    `/availability/calendar?nutritionistId=${nutritionistId}&startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  return response.json();
};
```

### 2. Obtener rango de fechas del mes

```typescript
const getMonthRange = (year: number, month: number) => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Último día del mes

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

// Uso
const { startDate, endDate } = getMonthRange(2025, 2); // Marzo 2025
// startDate: "2025-03-01"
// endDate: "2025-03-31"
```

### 3. Cargar calendario al cambiar de mes

```typescript
const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
const [currentMonth, setCurrentMonth] = useState({ year: 2025, month: 2 });

useEffect(() => {
  const loadCalendar = async () => {
    const { startDate, endDate } = getMonthRange(currentMonth.year, currentMonth.month);
    const data = await getCalendar(nutritionistId, startDate, endDate);
    setCalendar(data);
  };

  loadCalendar();
}, [currentMonth, nutritionistId]);

const handlePrevMonth = () => {
  setCurrentMonth(prev => {
    if (prev.month === 0) {
      return { year: prev.year - 1, month: 11 };
    }
    return { ...prev, month: prev.month - 1 };
  });
};

const handleNextMonth = () => {
  setCurrentMonth(prev => {
    if (prev.month === 11) {
      return { year: prev.year + 1, month: 0 };
    }
    return { ...prev, month: prev.month + 1 };
  });
};
```

### 4. Determinar estado visual de un día

```typescript
const getDayDisplayStatus = (day: DayCalendar) => {
  if (!day.isWorkDay) {
    return 'no-work'; // Día que no trabaja
  }

  if (day.isFullDayBlocked) {
    return 'full-blocked'; // Todo el día bloqueado
  }

  const available = day.slots.filter(s => s.status === 'available').length;
  const total = day.slots.length;

  if (available === 0) {
    return 'full'; // Sin disponibilidad
  }

  if (available < total / 2) {
    return 'limited'; // Poca disponibilidad
  }

  return 'available'; // Buena disponibilidad
};
```

### 5. Obtener resumen de slots por día

```typescript
const getSlotsSummary = (day: DayCalendar) => {
  if (!day.isWorkDay || day.isFullDayBlocked) {
    return null;
  }

  return {
    available: day.slots.filter(s => s.status === 'available').length,
    booked: day.slots.filter(s => s.status === 'booked').length,
    blocked: day.slots.filter(s => s.status === 'blocked').length,
    total: day.slots.length,
  };
};
```

### 6. Filtrar solo slots disponibles (para selección)

```typescript
const getAvailableSlots = (day: DayCalendar): string[] => {
  return day.slots
    .filter(slot => slot.status === 'available')
    .map(slot => slot.time);
};
```

### 7. Verificar si una fecha es seleccionable

```typescript
const isDateSelectable = (day: DayCalendar): boolean => {
  if (!day.isWorkDay) return false;
  if (day.isFullDayBlocked) return false;

  const hasAvailable = day.slots.some(s => s.status === 'available');
  return hasAvailable;
};
```

---

## Flujo de Uso

1. **Usuario entra a la página** → Cargar calendario del mes actual
2. **Usuario cambia de mes** → `GET /availability/calendar` con nuevo rango
3. **Usuario hace click en un día** → Mostrar slots del día seleccionado
4. **Usuario selecciona un slot disponible** → Proceder a crear cita

---

## Estados Visuales Sugeridos

| Estado | Condición |
|--------|-----------|
| `no-work` | `isWorkDay === false` |
| `full-blocked` | `isFullDayBlocked === true` |
| `full` | Todos los slots son `booked` o `blocked` |
| `limited` | Menos del 50% de slots disponibles |
| `available` | 50% o más slots disponibles |

---

## Notas

- El endpoint devuelve todos los días del rango, incluyendo los que no son días laborales
- Los días sin disponibilidad configurada tienen `isWorkDay: false` y `slots: []`
- Los días completamente bloqueados tienen `isFullDayBlocked: true` y `slots: []`
- El `reason` en slots bloqueados es opcional (puede no existir)
