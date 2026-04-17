<template>
  <div class="settings-form">
    <div class="field">
      <label class="label control-label">Question Count</label>
      <div class="select is-fullwidth">
        <select :value="questionMode" @change="$emit('update:questionMode', $event.target.value)">
          <option value="5">5 questions</option>
          <option value="10">10 questions</option>
          <option value="15">15 questions</option>
          <option value="20">20 questions</option>
          <option value="custom">Custom</option>
        </select>
      </div>
    </div>

    <div v-if="questionMode === 'custom'" class="field">
      <label class="label control-label">Custom Question Count</label>
      <input
        class="input"
        type="number"
        min="1"
        max="50"
        :value="customQuestionCount"
        @input="$emit('update:customQuestionCount', $event.target.value)"
        placeholder="Enter a number from 1 to 50"
      />
      <p class="help field-help">OpenTDB supports up to 50 questions per request.</p>
    </div>

    <div class="field">
      <label class="label control-label">Category</label>
      <div class="select is-fullwidth">
        <select :value="selectedCategory" @change="$emit('update:selectedCategory', $event.target.value)">
          <option value="">Any Category</option>
          <option v-for="category in categories" :key="category.id" :value="String(category.id)">
            {{ category.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="field">
      <label class="label control-label">Difficulty</label>
      <div class="select is-fullwidth">
        <select :value="selectedDifficulty" @change="$emit('update:selectedDifficulty', $event.target.value)">
          <option value="">Any Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </div>

    <slot name="actions"></slot>
  </div>
</template>

<script>
export default {
  name: 'SettingsForm',
  props: {
    questionMode: { type: String, default: '10' },
    customQuestionCount: { type: [String, Number], default: '10' },
    selectedCategory: { type: String, default: '' },
    selectedDifficulty: { type: String, default: '' },
    categories: { type: Array, default: () => [] }
  },
  emits: [
    'update:questionMode',
    'update:customQuestionCount',
    'update:selectedCategory',
    'update:selectedDifficulty'
  ]
}
</script>