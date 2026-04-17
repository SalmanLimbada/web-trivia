<template>
  <div ref="panel" class="question-panel">
    <p v-if="kicker" class="question-kicker">{{ kicker }}</p>
    <p class="question-text mb-4" v-html="question"></p>
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'QuestionPanel',
  props: {
    question: { type: String, required: true },
    kicker: { type: String, default: 'Current Question' },
    animate: { type: Boolean, default: true }
  },
  mounted() {
    if (!this.animate) return
    const $ = window.jQuery
    if (!$) return
    const node = this.$refs.panel
    if (!node) return
    $(node).stop(true, true).hide().slideDown(260).addClass('jq-flash')
    window.setTimeout(() => $(node).removeClass('jq-flash'), 700)
  }
}
</script>