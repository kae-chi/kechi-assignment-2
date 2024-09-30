document.addEventListener('DOMContentLoaded', () => {
	const chartArea = document.getElementById('plot-area');
	const clusterCountInput = document.getElementById('num-clusters');
	const initTypeSelect = document.getElementById('init-method');

	let pointsDataset = createRandomDataset();
	let clusterCenters = [];
	let pointAssignments = [];
	let previousClusterCenters = [];
	let isManualInit = false;
	let selectedCentroidCount = 0;
	let iterationCount = 0;
	const maxIterations = 100; // Limit to 100 iterations

	// Listener for initialization type
	initTypeSelect.addEventListener('change', () => {
		const initType = initTypeSelect.value;

		if (initType === 'manual') {
			isManualInit = true;
			selectedCentroidCount = 0;
			alert('Click on the chart to select centroids manually');
		} else {
			isManualInit = false;
		}
	});

	// Listeners for buttons
	document.getElementById('new-dataset').addEventListener('click', () => {
		pointsDataset = createRandomDataset();
		clusterCenters = [];
		pointAssignments = [];
		isManualInit = false;
		selectedCentroidCount = 0;
		iterationCount = 0; // Reset iteration count
		renderChart();
	});

	document.getElementById('step').addEventListener('click', () => {
		if (clusterCenters.length === 0) {
			initiateClusterCenters();
		} else if (iterationCount < maxIterations) {
			assignPointsToClusters();
			recalculateClusterCenters();
			iterationCount++; // Increment iteration count
		}
		renderChart();
	});

	document.getElementById('converge').addEventListener('click', () => {
		if (clusterCenters.length === 0) {
			initiateClusterCenters();
		}
		while (!checkConvergence() && iterationCount < maxIterations) {
			assignPointsToClusters();
			recalculateClusterCenters();
			iterationCount++; // Increment iteration count
		}
		renderChart();
	});

	document.getElementById('reset').addEventListener('click', () => {
		clusterCenters = [];
		pointAssignments = [];
		isManualInit = false;
		selectedCentroidCount = 0;
		iterationCount = 0; // Reset iteration count
		renderChart();
	});

	// Click listener for manual centroid initialization
	chartArea.addEventListener('click', (event) => {
		if (isManualInit) {
			const k = parseInt(clusterCountInput.value);
			if (selectedCentroidCount < k) {
				const boundingRect = chartArea.getBoundingClientRect();
				const xCoord = event.clientX - boundingRect.left;
				const yCoord = event.clientY - boundingRect.top;

				clusterCenters.push({ x: xCoord, y: yCoord });
				selectedCentroidCount++;

				if (selectedCentroidCount === k) {
					isManualInit = false;
					alert('All centroids have been selected. Proceed with clustering');
				}

				renderChart();
			}
		}
	});

	/*********************************************************************************************/
	// Function to initialize cluster centers
	function initiateClusterCenters() {
		const k = parseInt(clusterCountInput.value);
		clusterCenters = [];
		const initType = initTypeSelect.value;

		iterationCount = 0; // Reset iteration count here

		if (initType === 'manual') {
			isManualInit = true;
			selectedCentroidCount = 0;
			alert('Click on the chart to select centroids manually');
		} else if (initType === 'farthest') {
			// Farthest First Initialization
			const firstCenter = pointsDataset[Math.floor(Math.random() * pointsDataset.length)];
			clusterCenters.push({ ...firstCenter });

			while (clusterCenters.length < k) {
				let furthestPoint = null;
				let maxDist = -Infinity;

				pointsDataset.forEach(point => {
					const nearestDist = clusterCenters.reduce((minDist, center) => {
						const dist = Math.hypot(point.x - center.x, point.y - center.y);
						return Math.min(minDist, dist);
					}, Infinity);

					if (nearestDist > maxDist) {
						maxDist = nearestDist;
						furthestPoint = point;
					}
				});

				clusterCenters.push({ ...furthestPoint });
			}
		} else if (initType === 'random') {
			// Random Initialization
			for (let i = 0; i < k; i++) {
				const randomCenter = pointsDataset[Math.floor(Math.random() * pointsDataset.length)];
				clusterCenters.push({ ...randomCenter });
			}
		} else if (initType === 'kmeans++') {
			// KMeans++ Initialization
			clusterCenters.push(pointsDataset[Math.floor(Math.random() * pointsDataset.length)]);

			while (clusterCenters.length < k) {
				const distances = pointsDataset.map(point => {
					const minDist = clusterCenters.reduce((minDist, center) => {
						const dist = Math.hypot(point.x - center.x, point.y - center.y);
						return Math.min(minDist, dist);
					}, Infinity);
					return minDist;
				});

				const totalDist = distances.reduce((sum, dist) => sum + dist, 0);
				const randomDist = Math.random() * totalDist;
				let cumulativeDist = 0;

				for (let i = 0; i < pointsDataset.length; i++) {
					cumulativeDist += distances[i];
					if (cumulativeDist >= randomDist) {
						clusterCenters.push({ ...pointsDataset[i] });
						break;
					}
				}
			}
		}
		renderChart();
	}

	// Create random dataset
	function createRandomDataset() {
		const dataset = [];
		for (let i = 0; i < 300; i++) {
			dataset.push({
				x: Math.random() * chartArea.clientWidth - 1,
				y: Math.random() * chartArea.clientHeight - 1
			});
		}
		return dataset;
	}

	// Assign points to clusters
	function assignPointsToClusters() {
		pointAssignments = pointsDataset.map(point => {
			let nearestIndex = 0;
			let minDist = Infinity;
			clusterCenters.forEach((center, index) => {
				const dist = Math.hypot(point.x - center.x, point.y - center.y);
				if (dist < minDist) {
					minDist = dist;
					nearestIndex = index;
				}
			});
			return nearestIndex;
		});
	}

	// Recalculate cluster centers
	function recalculateClusterCenters() {
		previousClusterCenters = clusterCenters.map(center => ({ ...center }));
		const k = clusterCenters.length;
		const sums = Array(k).fill(0).map(() => ({ x: 0, y: 0, count: 0 }));

		pointsDataset.forEach((point, idx) => {
			const clusterIdx = pointAssignments[idx];
			sums[clusterIdx].x += point.x;
			sums[clusterIdx].y += point.y;
			sums[clusterIdx].count += 1;
		});

		sums.forEach((sum, idx) => {
			if (sum.count > 0) {
				clusterCenters[idx].x = sum.x / sum.count;
				clusterCenters[idx].y = sum.y / sum.count;
			}
		});
	}

	// Check if clustering has converged
	function checkConvergence() {
		return clusterCenters.every((center, idx) => {
			const prevCenter = previousClusterCenters[idx];
			return center.x === prevCenter.x && center.y === prevCenter.y;
		});
	}

	// Render the chart with points, cluster centers, and axes
	function renderChart() {
		chartArea.innerHTML = '';

		// Draw X and Y axes
		const axisX = document.createElement('div');
		axisX.style.position = 'absolute';
		axisX.style.width = '100%';
		axisX.style.height = '1px';
		axisX.style.backgroundColor = 'black';
		axisX.style.top = `${chartArea.clientHeight / 2}px`;
		chartArea.appendChild(axisX);

		const axisY = document.createElement('div');
		axisY.style.position = 'absolute';
		axisY.style.width = '1px';
		axisY.style.height = '100%';
		axisY.style.backgroundColor = 'black';
		axisY.style.left = `${chartArea.clientWidth / 2}px`;
		chartArea.appendChild(axisY);

		// Render points
		pointsDataset.forEach((point, idx) => {
			const dot = document.createElement('div');
			dot.style.position = 'absolute';
			dot.style.width = '5px';
			dot.style.height = '5px';
			dot.style.backgroundColor = pointAssignments[idx] !== undefined ? `hsl(${pointAssignments[idx] * 360 / clusterCenters.length}, 90%, 60%)` : 'gray';
			dot.style.borderRadius = '50%';
			dot.style.left = `${point.x}px`;
			dot.style.top = `${point.y}px`;
			chartArea.appendChild(dot);
		});

		// Render cluster centers
		clusterCenters.forEach(center => {
			const cross = document.createElement('div');
			cross.style.position = 'absolute';
			cross.style.width = '15px';
			cross.style.height = '15px';
			cross.style.backgroundColor = 'transparent';
			cross.style.borderLeft = '2px solid pink';
			cross.style.borderTop = '2px solid pink';
			cross.style.borderRight = '2px solid pink';
			cross.style.borderBottom = '2px solid pink';
			cross.style.transform = 'rotate(45deg)';
			cross.style.left = `${center.x - 7}px`;  // Adjust position to center the cross
			cross.style.top = `${center.y - 7}px`;   // Adjust position to center the cross
			chartArea.appendChild(cross);
		});
	}

	renderChart();
});
