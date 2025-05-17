import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Button, Paper, Tooltip } from '@mui/material';
import { fetchAllNmosResources, performConnection } from '../api';
import * as d3 from 'd3';

export default function NetworkTopology() {
  const dispatch = useDispatch();
  const connections = useSelector((state) => state.connections.connections);
  const loading = useSelector((state) => state.connections.loading);
  const error = useSelector((state) => state.connections.error);
  const [svgRef, setSvgRef] = useState(null);

  useEffect(() => {
    fetchData();
  }, [dispatch]);

  useEffect(() => {
    if (svgRef && connections.length > 0) {
      drawTopology();
    }
  }, [svgRef, connections]);

  const fetchData = async () => {
    dispatch({ type: 'FETCH_CONNECTIONS_REQUEST' });
    try {
      const nmosData = await fetchAllNmosResources();
      let derivedConnections = [];
      if (nmosData && nmosData.receivers && Array.isArray(nmosData.receivers)) {
        for (const receiver of nmosData.receivers) {
          if (receiver.subscription && receiver.subscription.active) {
            const sender = nmosData.senders?.find(s => s.id === receiver.subscription.sender_id);
            derivedConnections.push({
              id: receiver.id,
              receiver: receiver.label || receiver.id,
              receiver_details: receiver,
              sender: sender ? (sender.label || sender.id) : receiver.subscription.sender_id,
              sender_details: sender,
              status: sender ? 'active' : 'active_disconnected'
            });
          }
        }
      }
      dispatch({ type: 'FETCH_CONNECTIONS_SUCCESS', payload: derivedConnections });
    } catch (err) {
      dispatch({ type: 'FETCH_CONNECTIONS_FAILURE', payload: err.message });
    }
  };

  const drawTopology = () => {
    const svg = d3.select(svgRef);
    const width = svg.node().parentElement.clientWidth;
    const height = svg.node().parentElement.clientHeight;

    // 清空现有内容
    svg.selectAll("*").remove();

    // 创建节点数据
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    connections.forEach(conn => {
      if (!nodeMap.has(conn.sender)) {
        nodeMap.set(conn.sender, { id: conn.sender, name: conn.sender, type: 'sender' });
        nodes.push(nodeMap.get(conn.sender));
      }
      if (!nodeMap.has(conn.receiver)) {
        nodeMap.set(conn.receiver, { id: conn.receiver, name: conn.receiver, type: 'receiver' });
        nodes.push(nodeMap.get(conn.receiver));
      }
      links.push({ source: conn.sender, target: conn.receiver });
    });

    // 绘制连接线
    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .enter().append("line");

    // 绘制节点
    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 10)
      .attr("fill", d => d.type === 'sender' ? '#ff5252' : '#448aff')
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", handleNodeClick);

    // 添加节点标签
    const labels = svg.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .attr("dy", 25)
      .attr("text-anchor", "middle")
      .text(d => d.name)
      .attr("font-size", "12px")
      .attr("fill", "#333");

    // 力导向图模拟
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", ticked);

    function ticked() {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
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

    function handleNodeClick(event, d) {
      // 实现节点点击逻辑，例如显示详细信息或进行连接操作
      console.log('Node clicked:', d);
    }

    // 处理窗口大小变化
    window.addEventListener("resize", () => {
      const newWidth = svg.node().parentElement.clientWidth;
      const newHeight = svg.node().parentElement.clientHeight;
      svg.attr("width", newWidth).attr("height", newHeight);
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.3).restart();
    });
  };

  const handleConnect = async (senderId, receiverId) => {
    dispatch({ type: 'UPDATE_CONNECTION_REQUEST' });
    try {
      await performConnection(receiverId, senderId);
      dispatch({ type: 'UPDATE_CONNECTION_SUCCESS' });
      await fetchData(); // 重新获取更新后的数据
    } catch (err) {
      dispatch({ type: 'UPDATE_CONNECTION_FAILURE', payload: err.message });
    }
  };

  if (loading) {
    return <Box sx={{ padding: 3 }}><Typography>加载中...</Typography></Box>;
  }

  if (error) {
    return (
      <Box sx={{ padding: 3 }}>
        <Typography color="error">错误: {error}</Typography>
        <Button variant="contained" onClick={fetchData} style={{ marginTop: 16 }}>
          重试
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" gutterBottom>网络拓扑图</Typography>
      <Paper sx={{ width: '100%', height: 600 }}>
        <svg ref={setSvgRef} width="100%" height="100%" />
      </Paper>
      <Box sx={{ marginTop: 2 }}>
        <Typography variant="body1">点击并拖动节点以重新排列拓扑图。点击节点以查看详细信息或进行连接操作。</Typography>
      </Box>
    </Box>
  );
};
