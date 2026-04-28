export const boardTools = [
  {
    name: "move_card",
    description: "Bir kartı mevcut sütunundan başka bir sütuna taşır",
    input_schema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "Taşınacak kartın ID'si" },
        target_column_id: { type: "string", description: "Hedef sütunun ID'si" }
      },
      required: ["card_id", "target_column_id"]
    }
  },
  {
    name: "create_card",
    description: "Belirtilen sütuna yeni bir kart oluşturur",
    input_schema: {
      type: "object",
      properties: {
        column_id: { type: "string", description: "Kartın ekleneceği sütunun ID'si" },
        title: { type: "string", description: "Kart başlığı" },
        description: { type: "string", description: "Kart açıklaması (opsiyonel)" }
      },
      required: ["column_id", "title"]
    }
  },
  {
    name: "create_column",
    description: "Board'a yeni bir sütun ekler",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Sütun başlığı" }
      },
      required: ["title"]
    }
  },
  {
    name: "delete_card",
    description: "Belirtilen kartı siler",
    input_schema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "Silinecek kartın ID'si" }
      },
      required: ["card_id"]
    }
  },
  {
    name: "delete_column",
    description: "Adına göre belirtilen sütunu siler",
    input_schema: {
      type: "object",
      properties: {
        column_name: { type: "string", description: "Silinecek sütunun adı" }
      },
      required: ["column_name"]
    }
  },
  {
    name: "create_board",
    description: "Yeni bir board oluşturur",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Oluşturulacak board adı" }
      },
      required: ["name"]
    }
  },
  {
    name: "create_board_from_template",
    description:
      "Belirli bir şablonla board oluşturur (kanban, scrum, marketing, personal, empty)",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Oluşturulacak board adı" },
        template: {
          type: "string",
          enum: ["kanban", "scrum", "marketing", "personal", "empty"],
          description: "Kullanılacak şablon kimliği",
        },
      },
      required: ["name", "template"],
    },
  },
  {
    name: "delete_board",
    description: "Adına göre board siler",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Silinecek board adı" }
      },
      required: ["name"]
    }
  },
  {
    name: "list_boards",
    description: "Kullanıcının board listesini getirir",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "split_card_into_subtasks",
    description:
      "Bir kartın açıklamasını 3-4 alt göreve böler. Her alt görev ve ana kart için 1-10 urgency_score zorunlu.",
    input_schema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "Parçalanacak ana kart ID" },
        column_id: { type: "string", description: "Alt görevlerin ekleneceği sütun ID" },
        parent_urgency_score: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "Bölünen ana kartın aciliyet puanı (1-10)",
        },
        subtasks: {
          type: "array",
          description: "3-4 kısa, uygulanabilir alt görev; her birinde urgency_score (1-10)",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Alt görev başlığı" },
              description: { type: "string", description: "Alt görev açıklaması (opsiyonel)" },
              urgency_score: {
                type: "integer",
                minimum: 1,
                maximum: 10,
                description: "Alt görevin aciliyet puanı (1-10)",
              },
            },
            required: ["title"],
          },
        },
      },
      required: ["card_id", "column_id", "subtasks"],
    },
  },
]
