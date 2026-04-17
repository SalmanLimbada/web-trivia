<template>
  <div ref="chart" class="results-chart"></div>
</template>

<script>
import * as d3 from 'd3'

export default {
  name: 'SummaryChart',
  props: {
    options: { type: Array, required: true }
  },
  mounted() {
    this.render()
  },
  watch: {
    options() {
      this.render()
    }
  },
  beforeUnmount() {
    if (this.$refs.chart) {
      d3.select(this.$refs.chart).selectAll('*').remove()
    }
  },
  methods: {
    render() {
      const container = this.$refs.chart
      if (!container) return

      d3.select(container).selectAll('*').remove()

      const data = this.options.map((o) => ({
        answer: o.answer,
        count: o.count,
        isCorrect: o.isCorrect
      }))

      const width = Math.max(container.clientWidth || 520, 320)
      const height = 360
      const margin = { top: 24, right: 24, bottom: 90, left: 52 }

      const svg = d3.select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('class', 'results-chart-svg')
        .attr('role', 'img')
        .attr('aria-label', 'Answer breakdown chart for the current question')

      const x = d3.scaleBand()
        .domain(data.map((o) => o.answer))
        .range([margin.left, width - margin.right])
        .padding(0.28)

      const y = d3.scaleLinear()
        .domain([0, Math.max(d3.max(data, (o) => o.count) || 0, 1)])
        .nice()
        .range([height - margin.bottom, margin.top])

      svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickSize(0))
        .call((g) => g.selectAll('path, line').attr('stroke', '#cbd5e1'))
        .call((g) => g.selectAll('text').attr('fill', '#64748b').style('font-size', '12px'))
        .call((g) => g.selectAll('text').attr('transform', 'rotate(-18)').style('text-anchor', 'end'))

      svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(4).tickSizeOuter(0))
        .call((g) => g.selectAll('path, line').attr('stroke', '#cbd5e1'))
        .call((g) => g.selectAll('text').attr('fill', '#64748b').style('font-size', '12px'))

      svg.append('g')
        .selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', (o) => x(o.answer))
        .attr('y', height - margin.bottom)
        .attr('rx', 10).attr('ry', 10)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', (o) => (o.isCorrect ? '#16a34a' : '#dc2626'))
        .transition().duration(700)
        .attr('y', (o) => y(o.count))
        .attr('height', (o) => height - margin.bottom - y(o.count))

      svg.append('g')
        .selectAll('text')
        .data(data)
        .join('text')
        .attr('x', (o) => (x(o.answer) || 0) + x.bandwidth() / 2)
        .attr('y', (o) => y(o.count) - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#1f2937')
        .style('font-size', '13px').style('font-weight', '700')
        .text((o) => `${o.count} player${o.count === 1 ? '' : 's'}`)
    }
  }
}
</script>