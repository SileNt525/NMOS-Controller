import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';

const NetworkTopology = () => {
  const svgRef = useRef(null);
  const [data, setData] = React.useState({ nodes: [], links: [] });
  const [layout, setLayout] = React.useState('force');
  const [filter, setFilter] = React.useState({ type: 'all', connected: 'all' });

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svg.node().parentElement.clientWidth;
    const height = svg.node().parentElement.clientHeight;

    // 从API获取数据
    const fetchData = async () => {
      try {
        const response = await fetch('/api/topology');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching topology data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svg.node().parentElement.clientWidth;
    const height = svg.node().parentElement.clientHeight;

    // 清除之前的绘制
    svg.selectAll('g').remove();

    // 应用过滤
    const filteredNodes = data.nodes.filter(node => {
      if (filter.type !== 'all' && !node.id.startsWith(filter.type)) return false;
      if (filter.connected === 'connected') {
        return data.links.some(link => link.source.id === node.id || link.target.id === node.id);
      } else if (filter.connected === 'unconnected') {
        return !data.links.some(link => link.source.id === node.id || link.target.id === node.id);
      }
      return true;
    });

    const filteredLinks = data.links.filter(link => {
      return filteredNodes.some(node => node.id === link.source.id) && filteredNodes.some(node => node.id === link.target.id);
    });

    // 根据布局类型创建不同的模拟
    let simulation;
    if (layout === 'force') {
      simulation = d3.forceSimulation(filteredNodes)
        .force('link', d3.forceLink(filteredLinks).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-800))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .on('tick', ticked);
    } else if (layout === 'hierarchy') {
      // 层次结构布局
      const root = d3.hierarchy({ id: 'root', children: filteredNodes.map(node => ({ ...node, children: [] })) });
      const treeLayout = d3.tree().size([width, height - 50]);
      treeLayout(root);
      simulation = null;
    }

    // 绘制连线
    const link = svg.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line');

    // 绘制节点
    const node = svg.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('r', 12)
      .attr('fill', d => d.id.startsWith('Node') ? '#1f77b4' : '#ff7f0e')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut);

    // 添加节点标签
    const label = svg.append('g')
      .selectAll('text')
      .data(data.nodes)
      .enter()
      .append('text')
      .attr('x', 0)
      .attr('y', -15)
      .text(d => d.name)
      .attr('font-size', 12)
      .attr('fill', '#333');

    // 工具提示
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', '#fff')
      .style('border', '1px solid #ccc')
      .style('padding', '5px')
      .style('border-radius', '3px');

    function handleMouseOver(event, d) {
      d3.select(this).attr('r', 16);
      tooltip.transition()
        .duration(200)
        .style('opacity', 0.9);
      tooltip.html(`ID: ${d.id}<br/>Name: ${d.name}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    }

    function handleMouseOut() {
      d3.select(this).attr('r', 12);
      tooltip.transition()
        .duration(500)
        .style('opacity', 0);
    }

    function ticked() {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y - 15);
    }

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // 清理
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, []);

  return (
    <Box style={{ width: '100%', height: '600px', border: '1px solid #ccc' }}>
      <svg ref={svgRef} width="100%" height="100%" />
      <div style={{ position: 'absolute', top: 10, right: 10 }}>
        <button onClick={() => svg.call(d3.zoom().scaleBy(1.2))}>放大</button>
        <button onClick={() => svg.call(d3.zoom().scaleBy(0.8))}>缩小</button>
        <select value={layout} onChange={e => setLayout(e.target.value)}>
          <option value="force">力导向图</option>
          <option value="hierarchy">层次结构图</option>
        </select>
        <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
          <option value="all">所有类型</option>
          <option value="Node">节点</option>
          <option value="Device">设备</option>
        </select>
        <select value={filter.connected} onChange={e => setFilter({ ...filter, connected: e.target.value })}>
          <option value="all">所有连接状态</option>
          <option value="connected">已连接</option>
          <option value="unconnected">未连接</option>
        </select>
      </div>
    </Box>
  );
};

export default NetworkTopology;