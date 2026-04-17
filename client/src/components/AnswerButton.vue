<template>
  <button
    class="button is-info is-fullwidth mb-2 trivia-answer-button has-jquery-pulse"
    :disabled="disabled"
    @click="handleClick"
    v-html="answer"
  ></button>
</template>

<script>
export default {
  name: 'AnswerButton',
  props: {
    answer: { type: String, required: true },
    disabled: { type: Boolean, default: false }
  },
  emits: ['select'],
  methods: {
    handleClick(event) {
      const $ = window.jQuery
      if ($) {
        const node = $(event.currentTarget)
        node.removeClass('jq-active')
        void node[0].offsetWidth
        node.addClass('jq-active')
        window.setTimeout(() => node.removeClass('jq-active'), 900)
      }
      this.$emit('select', this.answer, event)
    }
  }
}
</script>