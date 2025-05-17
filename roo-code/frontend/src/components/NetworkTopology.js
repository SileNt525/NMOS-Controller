import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, Button, Paper, Tooltip } from '@mui/material';
import { fetchAllNmosResources, performConnection } from '../api';
import * as d3 from 'd3';
<<<<<<< HEAD
=======
import { fetchAllNmosResources, performConnection } from '../api'; // 确保这是从 api.js 正确导入的
import { 
    Box, 
    Typography, 
    Paper, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel, 
    TextField,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Snackbar
} from '@mui/material';
>>>>>>> 9ff1e3e50b95a2e5b2062ca3b292d7fe98f2a67e

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

<<<<<<< HEAD
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
=======
    // Process NMOS Nodes as D3 nodes
    if (nmosData && nmosData.nodes) {
        nmosData.nodes.forEach(node => {
            nodes.push({ id: node.id, label: node.label || node.id, group: 'nmos_node', type: 'node', details: node, selected: false });
            nodeIds.add(node.id);
        });
    }

    // Process NMOS Devices as D3 nodes, link them to their NMOS Node
    if (nmosData && nmosData.devices) {
        nmosData.devices.forEach(device => {
            nodes.push({ id: device.id, label: device.label || device.id, group: 'device', type: 'device', details: device, selected: false });
            nodeIds.add(device.id);
            if (device.node_id && nodeIds.has(device.node_id)) {
                links.push({ source: device.node_id, target: device.id, type: 'belongs_to_node' });
            }
        });
    }

    // Process Senders and Receivers, link them to their Device
    if (nmosData && nmosData.senders) {
        nmosData.senders.forEach(sender => {
            nodes.push({ id: sender.id, label: sender.label || sender.id, group: 'sender', type: 'sender', details: sender, selected: false, canBeSelected: true });
            nodeIds.add(sender.id);
            if (sender.device_id && nodeIds.has(sender.device_id)) {
                links.push({ source: sender.device_id, target: sender.id, type: 'belongs_to_device' });
            }
        });
    }

    if (nmosData && nmosData.receivers) {
        nmosData.receivers.forEach(receiver => {
            nodes.push({ id: receiver.id, label: receiver.label || receiver.id, group: 'receiver', type: 'receiver', details: receiver, selected: false, canBeSelected: true });
            nodeIds.add(receiver.id);
            if (receiver.device_id && nodeIds.has(receiver.device_id)) {
                links.push({ source: receiver.device_id, target: receiver.id, type: 'belongs_to_device' });
            }
            // Check for active connections (from receiver's subscription)
            if (receiver.subscription && receiver.subscription.sender_id && receiver.subscription.active) {
                if (nodeIds.has(receiver.subscription.sender_id)) {
                     links.push({ 
                        source: receiver.subscription.sender_id, 
                        target: receiver.id, 
                        type: 'active_connection', 
                        value: 5 // Example value for link strength/visibility
                    });
                } else {
                    console.warn(`Active connection for receiver ${receiver.id} points to unknown sender ${receiver.subscription.sender_id}`);
                }
            }
        });
    }
    
    // TODO: Add Flows and Sources if needed, and their links to Senders/Devices

    // Filter out links partículas where source or target might not have been added as a node
    const validLinks = links.filter(link => nodeIds.has(link.source) && nodeIds.has(link.target));

    return { nodes, links: validLinks };
};


function NetworkTopology() {
    const svgRef = useRef(null);
    const [nodes, setNodes] = useState([]);
    const [links, setLinks] = useState([]);
    const [layout, setLayout] = useState('force'); // 'force' or 'tree'
    const [filter, setFilter] = useState(''); // Text filter for node labels
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
    const [selectedNodes, setSelectedNodes] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    
    // Store the D3 simulation in a ref to control it across renders
    const simulationRef = useRef(null);

    // Debounce filter input
    const [debouncedFilter, setDebouncedFilter] = useState(filter);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilter(filter);
        }, 500);
        return () => {
            clearTimeout(handler);
        };
    }, [filter]);

    // 处理节点选择
    const handleNodeClick = (node) => {
        if (!node.canBeSelected) return;

        setNodes(prevNodes => {
            const newNodes = prevNodes.map(n => ({
                ...n,
                selected: n.id === node.id ? !n.selected : n.selected
            }));

            // 更新选中节点列表
            const updatedSelectedNodes = newNodes.filter(n => n.selected);
            setSelectedNodes(updatedSelectedNodes);

            // 如果选择了一个发送器和一个接收器，打开对话框
            if (updatedSelectedNodes.length === 2 && 
                ((updatedSelectedNodes[0].group === 'sender' && updatedSelectedNodes[1].group === 'receiver') ||
                 (updatedSelectedNodes[0].group === 'receiver' && updatedSelectedNodes[1].group === 'sender'))) {
                setDialogOpen(true);
            }

            return newNodes;
        });
    };

    // 处理连接对话框确认
    const handleConnectionConfirm = async () => {
        try {
            const sender = selectedNodes.find(n => n.group === 'sender');
            const receiver = selectedNodes.find(n => n.group === 'receiver');
            
            if (!sender || !receiver) {
                throw new Error('需要选择一个发送器和一个接收器');
            }

            await performConnection(receiver.id, sender.id);
            
            // 清除选中状态
            setNodes(prevNodes => prevNodes.map(n => ({ ...n, selected: false })));
            setSelectedNodes([]);
            setDialogOpen(false);
            
            // 显示成功消息
            setSnackbarMessage('连接成功');
            setSnackbarOpen(true);
            
            // 重新加载数据以更新视图
            fetchDataAndDraw();
        } catch (error) {
            setSnackbarMessage(`连接失败: ${error.message}`);
            setSnackbarOpen(true);
        }
    };

    // 处理对话框关闭
    const handleDialogClose = () => {
        setDialogOpen(false);
        // 清除选中状态
        setNodes(prevNodes => prevNodes.map(n => ({ ...n, selected: false })));
        setSelectedNodes([]);
    };

    // Main useEffect for fetching data and drawing graph
    useEffect(() => {
        setLoading(true);
        setError(null);

        const fetchDataAndDraw = async () => {
            try {
                const nmosData = await fetchAllNmosResources();
                let { nodes: transformedNodes, links: transformedLinks } = transformNmosDataToD3(nmosData);

                // Apply filter
                if (debouncedFilter) {
                    const lowerCaseFilter = debouncedFilter.toLowerCase();
                    const filteredNodeIds = new Set();
                    transformedNodes.forEach(node => {
                        if (node.label.toLowerCase().includes(lowerCaseFilter)) {
                            filteredNodeIds.add(node.id);
                        }
                    });
                    // Include nodes connected to filtered nodes to show context (optional)
                    // transformedLinks.forEach(link => {
                    //   if (filteredNodeIds.has(link.source.id || link.source)) filteredNodeIds.add(link.target.id || link.target);
                    //   if (filteredNodeIds.has(link.target.id || link.target)) filteredNodeIds.add(link.source.id || link.source);
                    // });
                    transformedNodes = transformedNodes.filter(node => filteredNodeIds.has(node.id));
                    transformedLinks = transformedLinks.filter(link => 
                        filteredNodeIds.has(typeof link.source === 'object' ? link.source.id : link.source) &&
                        filteredNodeIds.has(typeof link.target === 'object' ? link.target.id : link.target)
                    );
                }
                
                setNodes(transformedNodes);
                setLinks(transformedLinks);
                setLoading(false);

            } catch (err) {
                console.error('Error fetching or processing topology data:', err);
                setError(err.message || 'Failed to load topology data.');
                setLoading(false);
            }
        };

        fetchDataAndDraw();
    }, [debouncedFilter]); // Re-fetch and re-filter when debouncedFilter changes

    // Effect for D3 rendering based on nodes, links, and layout
    useEffect(() => {
        if (loading || error || !svgRef.current || nodes.length === 0) {
            // Clear previous SVG content if loading new data or error
            if(svgRef.current) d3.select(svgRef.current).selectAll("*").remove();
            if (simulationRef.current) {
                simulationRef.current.stop(); // Stop any previous simulation
            }
            return;
        }

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous SVG content before re-drawing

        const width = svgRef.current.parentElement.clientWidth || 800;
        const height = 600; // Or dynamic based on parent
        svg.attr('width', width).attr('height', height);
        // svg.attr("viewBox", [0, 0, width, height]); // For responsive SVG

        const g = svg.append("g"); // Main group for zoom & pan

        // Define arrow markers for directed links
        svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 15) // Position arrowhead at the end of the line
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('xoverflow', 'visible')
            .append('svg:path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#999')
            .style('stroke', 'none');

        // Setup links
        const link = g.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", d => d.type === 'active_connection' ? 2.5 : 1.5)
            .attr("stroke", d => d.type === 'active_connection' ? 'green' : '#999')
            .attr('marker-end', 'url(#arrowhead)'); // Apply arrowhead marker

        // Setup nodes with click handling
        const node = g.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", 8)
            .attr("fill", d => {
                if (d.selected) return '#f1c40f';
                if (d.group === 'nmos_node') return '#3498db';
                if (d.group === 'device') return '#e67e22';
                if (d.group === 'sender') return '#c0392b';
                if (d.group === 'receiver') return '#27ae60';
                return '#95a5a6';
            })
            .attr("stroke", d => d.selected ? '#f39c12' : '#fff')
            .attr("stroke-width", d => d.selected ? 3 : 1.5)
            .style("cursor", d => d.canBeSelected ? 'pointer' : 'default')
            .on("click", (event, d) => {
                if (d.canBeSelected) {
                    handleNodeClick(d);
                }
            })
            .on("mouseover", (event, d) => {
                setTooltip({
                    visible: true,
                    content: `
                        ID: ${d.id}<br/>
                        标签: ${d.label}<br/>
                        类型: ${d.group}<br/>
                        ${d.canBeSelected ? '点击以选择' : ''}
                    `,
                    x: event.pageX + 10,
                    y: event.pageY - 10
                });
            })
            .on("mouseout", () => {
                setTooltip({ visible: false, content: '', x: 0, y: 0 });
            });

        // Add labels to nodes
        const labels = g.append("g")
            .attr("class", "labels")
            .selectAll("text")
            .data(nodes)
            .enter().append("text")
            .attr("dx", 12) // Offset from node center
            .attr("dy", ".35em")
            .style("font-size", "10px")
            .style("fill", "#333")
            .text(d => d.label);

        // Apply layout
        if (layout === 'force') {
            if (simulationRef.current) {
                simulationRef.current.stop(); // Stop previous simulation
            }
            simulationRef.current = d3.forceSimulation(nodes)
                .force("link", d3.forceLink(links).id(d => d.id).distance(50))
                .force("charge", d3.forceManyBody().strength(-150))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collision", d3.forceCollide().radius(12)); // Prevent node overlap

            simulationRef.current.on("tick", () => {
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
            });
             // Drag functionality
            const drag = d3.drag()
                .on("start", (event, d) => {
                    if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                });
            node.call(drag);

        } else if (layout === 'tree') {
             if (simulationRef.current) {
                simulationRef.current.stop(); // Stop force simulation if running
                simulationRef.current = null;
            }
            // Hierarchical layout (e.g., D3 tree or cluster)
            // This requires data to be in a hierarchical format (root, children)
            // NMOS data is not inherently hierarchical in a single tree structure this way.
            // A simple tree layout might be challenging without significant data transformation
            // or focusing on a specific sub-hierarchy (e.g., a single NMOS Node and its descendants).
            // For now, we'll do a simple circular or grouped layout if not force.
            // This part needs a proper hierarchical data transformation.
            // Fallback to a simple static positioning for 'tree' for now.
            const treeLayout = d3.tree().size([width - 100, height - 100]);
            // Create a root node for D3 hierarchy if one doesn't exist naturally
            // This is a placeholder, proper hierarchy creation from NMOS data is complex
            const rootNodeId = nodes.find(n => n.group === 'nmos_node')?.id || nodes[0]?.id;
            if (rootNodeId) {
                const hierarchyData = d3.stratify()
                    .id(d => d.id)
                    .parentId(d => {
                        // Attempt to find a parent based on links
                        const parentLink = links.find(l => l.target === d.id || (l.target.id && l.target.id === d.id) );
                        return parentLink ? (typeof parentLink.source === 'object' ? parentLink.source.id : parentLink.source) : null;
                    })
                    (nodes.filter(n => n.id === rootNodeId || links.some(l => (l.source === n.id || l.target === n.id) || (l.source.id === n.id || l.target.id === n.id) ) )); // Simplified filter

                if (hierarchyData && hierarchyData.id) { // Check if stratification was successful
                    const root = d3.hierarchy(hierarchyData);
                    treeLayout(root);
                    const treeNodes = root.descendants();
                    const treeLinks = root.links();

                    g.selectAll("line").data(treeLinks).join("line")
                        .attr("x1", d => d.source.x + 50)
                        .attr("y1", d => d.source.y + 50)
                        .attr("x2", d => d.target.x + 50)
                        .attr("y2", d => d.target.y + 50)
                        .attr('marker-end', 'url(#arrowhead)');

                    g.selectAll("circle").data(treeNodes).join("circle")
                        .attr("cx", d => d.x + 50)
                        .attr("cy", d => d.y + 50)
                        .attr("r", 8)
                        .attr("fill", d_hier => {
                            const originalNode = nodes.find(n => n.id === d_hier.id);
                            if (originalNode?.group === 'nmos_node') return 'blue';
                            if (originalNode?.group === 'device') return 'orange';
                            if (originalNode?.group === 'sender') return 'red';
                            if (originalNode?.group === 'receiver') return 'green';
                            return 'gray';
                        });
                    
                    g.selectAll(".labels text").data(treeNodes).join("text")
                        .attr("x", d => d.x + 50)
                        .attr("y", d => d.y + 50)
                        .text(d => nodes.find(n => n.id === d.id)?.label || d.id);
                } else {
                     console.warn("Could not create valid hierarchy for tree layout. Displaying nodes statically.");
                     // Static display as fallback
                      nodes.forEach((n, i) => { n.x = (i % 10) * 80 + 50; n.y = Math.floor(i / 10) * 80 + 50; });
                      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
                      node.attr("cx", d => d.x).attr("cy", d => d.y);
                      labels.attr("x", d => d.x).attr("y", d => d.y);
                }
            } else {
                console.warn("No root node found for tree layout. Displaying nodes statically.");
                 // Static display as fallback
                nodes.forEach((n, i) => { n.x = (i % 10) * 80 + 50; n.y = Math.floor(i / 10) * 80 + 50; });
                link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
                node.attr("cx", d => d.x).attr("cy", d => d.y);
                labels.attr("x", d => d.x).attr("y", d => d.y);
            }
        }

        // Zoom functionality
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4]) // Zoom range
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });
        svg.call(zoom);
        
        // Cleanup function for this effect
        return () => {
            if (simulationRef.current) {
                simulationRef.current.stop();
            }
             // Detach D3 event listeners, e.g., zoom, drag. D3's .on(type, null)
            svg.on(".zoom", null); // Remove zoom listener
            node.on(".drag", null); // Remove drag listeners
            // Clear SVG content more reliably on cleanup
            if(svgRef.current) d3.select(svgRef.current).selectAll("*").remove();
        };

    }, [nodes, links, layout, loading, error]); // Add all relevant dependencies that trigger re-render of D3

    if (error) {
        return <Alert severity="error">Error loading topology: {error}</Alert>;
>>>>>>> 9ff1e3e50b95a2e5b2062ca3b292d7fe98f2a67e
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
<<<<<<< HEAD
      <Box sx={{ padding: 3 }}>
        <Typography color="error">错误: {error}</Typography>
        <Button variant="contained" onClick={fetchData} style={{ marginTop: 16 }}>
          重试
        </Button>
      </Box>
=======
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Network Topology</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <FormControl sx={{ minWidth: 120, mr: 2 }}>
                    <InputLabel id="layout-select-label">Layout</InputLabel>
                    <Select
                        labelId="layout-select-label"
                        value={layout}
                        label="Layout"
                        onChange={(e) => setLayout(e.target.value)}
                    >
                        <MenuItem value="force">Force-Directed</MenuItem>
                        <MenuItem value="tree">Hierarchical (Experimental)</MenuItem>
                    </Select>
                </FormControl>
                <TextField 
                    label="Filter Nodes" 
                    variant="outlined" 
                    size="small"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </Box>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress />
                    <Typography sx={{ml: 2}}>Loading Topology Data...</Typography>
                </Box>
            ) : (
                <Box sx={{ border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                    <svg ref={svgRef}></svg>
                    {tooltip.visible && (
                        <Box
                            sx={{
                                position: 'absolute',
                                left: tooltip.x,
                                top: tooltip.y,
                                background: 'rgba(0,0,0,0.8)',
                                color: 'white',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                pointerEvents: 'none', // Important for mouse events to pass through
                                transform: 'translateY(-100%)', // Position above cursor
                            }}
                            dangerouslySetInnerHTML={{ __html: tooltip.content }}
                        />
                    )}
                </Box>
            )}
            {!loading && nodes.length === 0 && !error && (
                <Alert severity="info" sx={{mt: 2}}>No topology data to display. Ensure NMOS resources are registered.</Alert>
            )}

            {/* Connection Dialog */}
            <Dialog open={dialogOpen} onClose={handleDialogClose}>
                <DialogTitle>确认连接</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        是否要连接以下设备？<br/>
                        发送器: {selectedNodes.find(n => n.group === 'sender')?.label}<br/>
                        接收器: {selectedNodes.find(n => n.group === 'receiver')?.label}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose}>取消</Button>
                    <Button onClick={handleConnectionConfirm} variant="contained" color="primary">
                        确认
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success/Error Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
            />
        </Paper>
>>>>>>> 9ff1e3e50b95a2e5b2062ca3b292d7fe98f2a67e
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
