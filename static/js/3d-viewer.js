// 3D Viewer JavaScript - Clean & Optimized
class ThreeJSViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.models = new Map();
        this.selectedModel = null;
        this.isOrthographic = false;
        this.showGrid = true;
        this.showAxes = true;
        this.showShadows = true;
        
        this.stats = {
            fps: 0,
            lastTime: performance.now(),
            frameCount: 0,
            totalVertices: 0,
            totalPolygons: 0
        };

        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // Создаем сцену
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);

        // Создаем камеру
        const canvasContainer = document.getElementById('scene-canvas');
        this.camera = new THREE.PerspectiveCamera(75, canvasContainer.offsetWidth / canvasContainer.offsetHeight, 0.1, 1000);
        this.camera.position.set(10, 10, 10);

        // Создаем рендерер
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        canvasContainer.appendChild(this.renderer.domElement);

        // Настраиваем OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        
        // Blender-like controls
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        // Добавляем освещение
        this.setupLighting();

        // Добавляем сетку и оси
        this.addGridHelper();
        this.addAxesHelper();

        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        // Directional light
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.directionalLight.position.set(10, 10, 10);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.scene.add(this.directionalLight);
    }

    addGridHelper() {
        this.gridHelper = new THREE.GridHelper(50, 20, 0x444444, 0x222222);
        this.scene.add(this.gridHelper);
    }

    addAxesHelper() {
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.gridHelper.visible = this.showGrid;
    }

    toggleAxes() {
        this.showAxes = !this.showAxes;
        this.axesHelper.visible = this.showAxes;
    }

    toggleShadows() {
        this.showShadows = !this.showShadows;
        this.directionalLight.castShadow = this.showShadows;
        this.models.forEach(model => {
            model.object.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = this.showShadows;
                    child.receiveShadow = this.showShadows;
                }
            });
        });
    }

    toggleCamera() {
        const canvasContainer = document.getElementById('scene-canvas');
        
        if (this.isOrthographic) {
            // Переключаем на перспективную камеру
            const aspect = canvasContainer.offsetWidth / canvasContainer.offsetHeight;
            this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
            this.camera.position.copy(this.controls.object.position);
            this.camera.quaternion.copy(this.controls.object.quaternion);
            document.getElementById('camera-info').textContent = 'Перспектива';
        } else {
            // Переключаем на ортогональную камеру
            const aspect = canvasContainer.offsetWidth / canvasContainer.offsetHeight;
            const size = 10;
            this.camera = new THREE.OrthographicCamera(
                -size * aspect, size * aspect,
                size, -size,
                0.1, 1000
            );
            this.camera.position.copy(this.controls.object.position);
            this.camera.quaternion.copy(this.controls.object.quaternion);
            document.getElementById('camera-info').textContent = 'Ортогональная';
        }
        
        this.isOrthographic = !this.isOrthographic;
        this.controls.object = this.camera;
        this.controls.update();
        this.onWindowResize();
    }

    async loadModels(files) {
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = '';

        for (const file of files) {
            await this.loadSingleModel(file);
        }
        
        this.updateStats();
        this.updateModelSelector();
    }

    async loadSingleModel(file) {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.addFileToList(file.name, fileId, 'loading');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload-3d-model', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.detail || 'Ошибка загрузки');
            }

            // Загружаем модель
            const model = await this.loadModelByType(result.url, file);
            const modelId = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            this.models.set(modelId, {
                object: model,
                name: file.name,
                type: result.file_type,
                file: file
            });

            this.updateFileStatus(fileId, 'success');
            this.hideOverlay();
            this.showToast(`"${file.name}" загружена`);

        } catch (error) {
            console.error('Error loading model:', error);
            this.updateFileStatus(fileId, 'error');
            this.showToast(`Ошибка: ${error.message}`, 'error');
        }
    }

    addFileToList(filename, fileId, status) {
        const fileList = document.getElementById('file-list');
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.id = fileId;
        fileItem.innerHTML = `
            <span class="file-name">${filename}</span>
            <span class="file-status ${status}">${this.getStatusText(status)}</span>
        `;
        fileList.appendChild(fileItem);
    }

    updateFileStatus(fileId, status) {
        const fileItem = document.getElementById(fileId);
        if (fileItem) {
            const statusElement = fileItem.querySelector('.file-status');
            statusElement.className = `file-status ${status}`;
            statusElement.textContent = this.getStatusText(status);
        }
    }

    getStatusText(status) {
        const statusTexts = {
            'loading': '...',
            'success': '✓',
            'error': '✗'
        };
        return statusTexts[status] || status;
    }

    async loadModelByType(url, file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        switch (extension) {
            case 'obj':
                return await this.loadOBJModel(url);
            case 'stl':
                return await this.loadSTLModel(url);
            case 'gltf':
            case 'glb':
                return await this.loadGLTFModel(url);
            default:
                throw new Error(`Не поддерживается: ${extension}`);
        }
    }

    loadOBJModel(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.OBJLoader();
            loader.load(
                url,
                (object) => {
                    this.setupModel(object);
                    resolve(object);
                },
                undefined,
                (error) => {
                    reject(new Error(`OBJ: ${error.message}`));
                }
            );
        });
    }

    loadSTLModel(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();
            loader.load(
                url,
                (geometry) => {
                    geometry.computeVertexNormals();
                    const material = new THREE.MeshPhongMaterial({ 
                        color: 0x3498db,
                        specular: 0x111111,
                        shininess: 200
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    this.setupModel(mesh);
                    resolve(mesh);
                },
                undefined,
                (error) => {
                    reject(new Error(`STL: ${error.message}`));
                }
            );
        });
    }

    loadGLTFModel(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    const model = gltf.scene;
                    this.setupModel(model);
                    resolve(model);
                },
                undefined,
                (error) => {
                    reject(new Error(`GLTF: ${error.message}`));
                }
            );
        });
    }

    setupModel(object) {
        // Устанавливаем тени и базовые настройки
        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = this.showShadows;
                child.receiveShadow = this.showShadows;
                
                if (!child.material) {
                    child.material = new THREE.MeshStandardMaterial({ 
                        color: 0x3498db,
                        roughness: 0.7,
                        metalness: 0.3
                    });
                }
                
                if (child.geometry) {
                    child.geometry.computeVertexNormals();
                }
            }
        });

        this.scene.add(object);
        this.centerAndScaleModel(object);
        this.updateModelStatistics();
    }

    centerAndScaleModel(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Центрируем модель
        object.position.x -= center.x;
        object.position.y -= center.y;
        object.position.z -= center.z;

        // Масштабируем
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 8 / maxDim : 1;
        object.scale.setScalar(scale);

        // Настраиваем камеру
        const cameraDistance = Math.max(size.x, size.y, size.z) * 1.5;
        this.camera.position.set(cameraDistance, cameraDistance, cameraDistance);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    updateModelStatistics() {
        let totalVertices = 0;
        let totalPolygons = 0;

        this.models.forEach(modelData => {
            modelData.object.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    const geometry = child.geometry;
                    totalVertices += geometry.attributes.position ? geometry.attributes.position.count : 0;
                    
                    if (geometry.index) {
                        totalPolygons += geometry.index.count / 3;
                    } else if (geometry.attributes.position) {
                        totalPolygons += geometry.attributes.position.count / 3;
                    }
                }
            });
        });

        this.stats.totalVertices = totalVertices;
        this.stats.totalPolygons = totalPolygons;

        document.getElementById('models-count').textContent = this.models.size;
        document.getElementById('total-vertices').textContent = totalVertices.toLocaleString();
        document.getElementById('total-polygons').textContent = totalPolygons.toLocaleString();
    }

    updateStats() {
        this.updateModelStatistics();
    }

    updateModelSelector() {
        const selector = document.getElementById('model-selector');
        selector.innerHTML = '<option value="">Выберите модель</option>';
        
        this.models.forEach((modelData, modelId) => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelData.name;
            selector.appendChild(option);
        });
    }

    selectModel(modelId) {
        if (this.selectedModel) {
            // Сбрасываем выделение предыдущей модели
            this.selectedModel.traverse(child => {
                if (child.isMesh) {
                    child.material.emissive.setHex(0x000000);
                }
            });
        }

        if (modelId && this.models.has(modelId)) {
            this.selectedModel = this.models.get(modelId).object;
            
            // Подсвечиваем выбранную модель
            this.selectedModel.traverse(child => {
                if (child.isMesh) {
                    child.material.emissive.setHex(0x333333);
                }
            });

            this.updateTransformControls();
        } else {
            this.selectedModel = null;
        }
    }

    updateTransformControls() {
        if (!this.selectedModel) return;

        document.getElementById('position-x').value = this.selectedModel.position.x.toFixed(2);
        document.getElementById('position-y').value = this.selectedModel.position.y.toFixed(2);
        document.getElementById('position-z').value = this.selectedModel.position.z.toFixed(2);

        const euler = new THREE.Euler().setFromQuaternion(this.selectedModel.quaternion);
        document.getElementById('rotation-x').value = THREE.MathUtils.radToDeg(euler.x).toFixed(1);
        document.getElementById('rotation-y').value = THREE.MathUtils.radToDeg(euler.y).toFixed(1);
        document.getElementById('rotation-z').value = THREE.MathUtils.radToDeg(euler.z).toFixed(1);

        document.getElementById('scale-all').value = this.selectedModel.scale.x.toFixed(2);
    }

    applyTransform() {
        if (!this.selectedModel) return;

        // Позиция
        this.selectedModel.position.x = parseFloat(document.getElementById('position-x').value) || 0;
        this.selectedModel.position.y = parseFloat(document.getElementById('position-y').value) || 0;
        this.selectedModel.position.z = parseFloat(document.getElementById('position-z').value) || 0;

        // Вращение
        const rotationX = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotation-x').value) || 0);
        const rotationY = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotation-y').value) || 0);
        const rotationZ = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotation-z').value) || 0);
        
        this.selectedModel.rotation.set(rotationX, rotationY, rotationZ);

        // Масштаб
        const scale = parseFloat(document.getElementById('scale-all').value) || 1;
        this.selectedModel.scale.setScalar(scale);
    }

    clearScene() {
        this.models.forEach((modelData, modelId) => {
            this.scene.remove(modelData.object);
            modelData.object.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });

        this.models.clear();
        this.selectedModel = null;
        this.updateStats();
        this.updateModelSelector();
        this.showOverlay();
        this.showToast('Все модели удалены');
    }

    setView(direction) {
        const distance = 10;
        
        switch (direction) {
            case 'front':
                this.camera.position.set(0, 0, distance);
                break;
            case 'top':
                this.camera.position.set(0, distance, 0);
                break;
            case 'right':
                this.camera.position.set(distance, 0, 0);
                break;
        }
        
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    focusOnSelected() {
        if (this.selectedModel) {
            const box = new THREE.Box3().setFromObject(this.selectedModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const distance = maxDim * 1.5;

            this.camera.position.copy(center).add(new THREE.Vector3(distance, distance, distance));
            this.controls.target.copy(center);
            this.controls.update();
        }
    }

    hideOverlay() {
        if (this.models.size > 0) {
            document.getElementById('scene-overlay').style.display = 'none';
        }
    }

    showOverlay() {
        document.getElementById('scene-overlay').style.display = 'flex';
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show';
        
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }

    onWindowResize() {
        const canvasContainer = document.getElementById('scene-canvas');
        
        if (this.isOrthographic) {
            const aspect = canvasContainer.offsetWidth / canvasContainer.offsetHeight;
            const size = 10;
            this.camera.left = -size * aspect;
            this.camera.right = size * aspect;
            this.camera.top = size;
            this.camera.bottom = -size;
        } else {
            this.camera.aspect = canvasContainer.offsetWidth / canvasContainer.offsetHeight;
        }
        
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
    }

    updateFPS() {
        const now = performance.now();
        this.stats.frameCount++;
        
        if (now >= this.stats.lastTime + 1000) {
            this.stats.fps = Math.round((this.stats.frameCount * 1000) / (now - this.stats.lastTime));
            this.stats.frameCount = 0;
            this.stats.lastTime = now;
            
            document.getElementById('fps-counter').textContent = `${this.stats.fps} FPS`;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updateFPS();

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        // Загрузка файлов
        const fileInput = document.getElementById('file-input');
        const fileInputBtn = document.getElementById('file-input-btn');
        const uploadArea = document.getElementById('upload-area');

        fileInputBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadModels(Array.from(e.target.files));
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadModels(Array.from(files));
            }
        });

        // Управление камерой
        document.getElementById('reset-camera').addEventListener('click', () => {
            this.controls.reset();
            this.camera.position.set(10, 10, 10);
            this.camera.lookAt(0, 0, 0);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        });

        document.getElementById('view-front').addEventListener('click', () => this.setView('front'));
        document.getElementById('view-top').addEventListener('click', () => this.setView('top'));
        document.getElementById('view-right').addEventListener('click', () => this.setView('right'));
        document.getElementById('toggle-perspective').addEventListener('click', () => this.toggleCamera());
        document.getElementById('focus-selected').addEventListener('click', () => this.focusOnSelected());

        // Настройки сцены
        document.getElementById('background-color').addEventListener('change', (e) => {
            this.scene.background = new THREE.Color(e.target.value);
        });

        document.getElementById('toggle-grid').addEventListener('change', (e) => {
            this.toggleGrid();
        });

        document.getElementById('toggle-axes').addEventListener('change', (e) => {
            this.toggleAxes();
        });

        document.getElementById('toggle-shadows').addEventListener('change', (e) => {
            this.toggleShadows();
        });

        // Освещение
        document.getElementById('ambient-light').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.ambientLight.intensity = value;
            document.getElementById('ambient-value').textContent = value.toFixed(1);
        });

        document.getElementById('directional-light').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.directionalLight.intensity = value;
            document.getElementById('directional-value').textContent = value.toFixed(1);
        });

        document.getElementById('light-color').addEventListener('input', (e) => {
            this.directionalLight.color = new THREE.Color(e.target.value);
            this.ambientLight.color = new THREE.Color(e.target.value);
        });

        // Трансформации
        document.getElementById('model-selector').addEventListener('change', (e) => {
            this.selectModel(e.target.value);
        });

        // Слушатели изменений трансформаций
        ['position-x', 'position-y', 'position-z', 'rotation-x', 'rotation-y', 'rotation-z', 'scale-all']
            .forEach(id => {
                document.getElementById(id).addEventListener('input', () => this.applyTransform());
            });

        document.getElementById('scale-reset').addEventListener('click', () => {
            document.getElementById('scale-all').value = '1';
            this.applyTransform();
        });

        document.getElementById('scale-fit').addEventListener('click', () => {
            if (this.selectedModel) {
                const box = new THREE.Box3().setFromObject(this.selectedModel);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = maxDim > 0 ? 5 / maxDim : 1;
                document.getElementById('scale-all').value = scale.toFixed(2);
                this.applyTransform();
            }
        });

        // Действия
        document.getElementById('clear-all').addEventListener('click', () => {
            if (confirm('Удалить все модели?')) {
                this.clearScene();
            }
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.viewer = new ThreeJSViewer();

    document.getElementById('home-btn')?.addEventListener('click', () => {
        window.location.href = '/';
    });
});