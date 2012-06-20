var SS = SS || {};

SS.ScaleTransformerInitiator = SS.TransformerInitiator.extend({

    initialize: function(attributes) { 
        SS.TransformerInitiator.prototype.initialize.call(this, attributes);

        this.arrowViews = [
        new SS.ScaleArrowViewMaxXMaxY({model: this}),
            new SS.ScaleArrowViewMaxXMinY({model: this}),
            new SS.ScaleArrowViewMinXMinY({model: this}),
            new SS.ScaleArrowViewMinXMaxY({model: this}),
        ];
        
        this.views = this.views.concat(this.arrowViews);
        this.views = this.views.concat([
            new SS.ScaleBoxView({model: this}),
            new SS.ScaleFootprintView({model: this}),
        ]);
    },

    mouseDownOnArrow: function(arrowView) {
        
    var geomNode = this.geomNode;
        var editingNode = geomNode.editableCopy();
        var transform = new Transform({
            type: 'scale',
            editing: true,
            origin: {x: Math.round(this.center.x), 
                     y: Math.round(this.center.y), 
                     z: 0},
            parameters: {factor: 1.0}
        });
        editingNode.transforms.push(transform);
        geomNode.originalSceneObjects = geomNode.sceneObjects;

        selectionManager.deselectID(geomNode.id);
        geom_doc.replace(geomNode, editingNode);

        new SS.ScaleTransformer({originalNode: geomNode,
                                 editingNode: editingNode, 
                                 transform: transform,
                                 anchorFunction: arrowView.anchorFunction,
                                 mouseDownArrowViewIndex: this.arrowViews.indexOf(arrowView)});
    },

});

SS.ScaleTransformer = SS.Transformer.extend({

    initialize: function(attributes) { 
        SS.Transformer.prototype.initialize.call(this, attributes);

        if (!attributes.editingExisting) {
            this.anchorPosition = attributes.anchorFunction(this.boundingBox);

            var arrowViews = [
            new SS.ScaleArrowViewMaxXMaxY({model: this}),
                new SS.ScaleArrowViewMaxXMinY({model: this}),
                new SS.ScaleArrowViewMinXMinY({model: this}),
                new SS.ScaleArrowViewMinXMaxY({model: this}),
        ];
            SS.sceneView.addToMouseOverAndMouseDown(arrowViews[attributes.mouseDownArrowViewIndex]);

            var newViews = [
                new SS.ScaleGeomNodeView({model: this}),
                new SS.ScaleFactorText({model: this}),
                new SS.ScaleBoxView({model: this}),
                new SS.ScaleFootprintView({model: this}),
            ];

            this.views = this.views.concat(newViews);
            this.views = this.views.concat(arrowViews);
        }
    },

    mouseDown: function(arrowView, event) {
        this.anchorPosition = arrowView.anchorFunction(this.boundingBox);
    },

    

});

SS.ScaleGeomNodeView = Backbone.View.extend({

    initialize: function() {
        this.render();
        this.model.on('change:model', this.render, this);
    },

    render: function() {
        var transform = this.model.transform;
        var scalePoint = new THREE.Vector3(transform.origin.x,
                                           transform.origin.y,
                                           transform.origin.z);

        // TODO: Replace with model for geom node
        SS.scaleGeomNodeRendering(this.model.originalNode, 
                                  this.model.editingNode, 
                                  scalePoint, 
                                  this.model.transform.parameters.factor);
    },

});

SS.ScaleArrowView = SS.InteractiveSceneView.extend({
    
    initialize: function() {
    SS.InteractiveSceneView.prototype.initialize.call(this);
        this.on('mouseDown', this.mouseDown, this);
        this.on('mouseDrag', this.drag);
    },

    remove: function() {
        SS.InteractiveSceneView.prototype.remove.call(this);
        this.model.off('mouseDown', this.mouseDownOnArrow);
        this.off('mouseDrag', this.drag);
    },

    mouseDown: function() {
        this.model.mouseDownOnArrow && this.model.mouseDownOnArrow(this);
    },

    render: function() {
        this.clear();

        var arrowGeometry = new THREE.Geometry();
        var positions = [[0, 0, 0], 
                         [1, -0.75, 0], [1, -0.25, 0], 
                         [1.5, -0.25, 0], [1.5, -0.75, 0],
                         [2.5, 0, 0], 
                         [1.5, 0.75, 0], [1.5, 0.25, 0], 
                         [1, 0.25, 0], [1, 0.75, 0], 
                         [0, 0, 0]];
        var that = this;
        positions = positions.map(function(pos) {
            return [pos[0]*that.cameraScale,
                    pos[1]*that.cameraScale, 
                    pos[2]*that.cameraScale]; 
        });

        arrowGeometry.vertices = positions.map(function(coordinates) {
            return new THREE.Vector3(coordinates[0], coordinates[1], coordinates[2]);
        });
        arrowGeometry.faces.push(new THREE.Face4(2,3,7,8));
        arrowGeometry.faces.push(new THREE.Face3(0,1,9));
        arrowGeometry.faces.push(new THREE.Face3(4,5,6));
        arrowGeometry.computeCentroids();
        arrowGeometry.computeFaceNormals();
        
        var arrowMesh = new THREE.Mesh(arrowGeometry, 
                                       new THREE.MeshBasicMaterial({color: SS.materials.faceColor, 
                                                                    transparent: true, 
                                                                    opacity: 0.5}));
        arrowMesh.doubleSided = true;
        
        var lineGeom = new THREE.Geometry();
        lineGeom.vertices = arrowGeometry.vertices;
        var line = new THREE.Line(lineGeom, 
                                  new THREE.LineBasicMaterial({color: SS.materials.lineColor, 
                                                               wireframe : true, 
                                                               linewidth: 2.0, 
                                                               transparent: true, 
                                                               opacity: 0.5 }));

        this.sceneObject.add(arrowMesh);
        this.sceneObject.add(line);
       
        return this;
    },

    drag: function(event) {

        var dxFrom = this.model.anchorPosition.x - this.model.transform.origin.x;
        var dyFrom = this.model.anchorPosition.y - this.model.transform.origin.y;

        var r1 = Math.sqrt(dxFrom*dxFrom + dyFrom*dyFrom);

        var workplanePosition = SS.sceneView.determinePositionOnWorkplane(event);
        var dxTo = workplanePosition.x - this.model.transform.origin.x;
        var dyTo = workplanePosition.y - this.model.transform.origin.y;
        var r2 = Math.sqrt(dxTo*dxTo + dyTo*dyTo);

        var factor = parseFloat((r2/r1).toFixed(3));
        if (!event.ctrlKey) {
            factor = Math.round(factor*10)/10;
        }

        this.model.setParameters({
            factor: factor
        });
    },

    
});

SS.ScaleArrowViewMaxXMaxY = SS.ScaleArrowView.extend({

    initialize: function() {
    SS.ScaleArrowView.prototype.initialize.call(this);
        this.render();
    },
    
    anchorFunction: function(boundingBox) {
        return {x: boundingBox.max.x, 
                y: boundingBox.max.y};
    },

    render: function() {
        SS.ScaleArrowView.prototype.render.call(this);
        this.sceneObject.position.x = this.model.boundingBox.max.x + 1;
        this.sceneObject.position.y = this.model.boundingBox.max.y + 1;
        this.sceneObject.rotation.z = 1/4*Math.PI;
        this.postRender();
        return this;
    },
});

SS.ScaleArrowViewMinXMaxY = SS.ScaleArrowView.extend({

    initialize: function() {
    SS.ScaleArrowView.prototype.initialize.call(this);
        this.render();
    },

    anchorFunction: function(boundingBox) {
        return {x: boundingBox.min.x, 
                y: boundingBox.max.y};
    },

    render: function() {
        SS.ScaleArrowView.prototype.render.call(this);
        this.sceneObject.position.x = this.model.boundingBox.min.x - 1;
        this.sceneObject.position.y = this.model.boundingBox.max.y + 1;
        this.sceneObject.rotation.z = 3/4*Math.PI;
        this.postRender();
        return this;
    },
});

SS.ScaleArrowViewMinXMinY = SS.ScaleArrowView.extend({

    initialize: function() {
    SS.ScaleArrowView.prototype.initialize.call(this);
        this.render();
    },

    anchorFunction: function(boundingBox) {
        return {x: boundingBox.min.x, 
                y: boundingBox.min.y};
    },

    render: function() {
        SS.ScaleArrowView.prototype.render.call(this);
        this.sceneObject.position.x = this.model.boundingBox.min.x - 1;
        this.sceneObject.position.y = this.model.boundingBox.min.y - 1;
        this.sceneObject.rotation.z = 5/4*Math.PI;
        this.postRender();
        return this;
    },
});

SS.ScaleArrowViewMaxXMinY = SS.ScaleArrowView.extend({

    initialize: function() {
    SS.ScaleArrowView.prototype.initialize.call(this);
        this.render();
    },

    anchorFunction: function(boundingBox) {
        return {x: boundingBox.max.x, 
                y: boundingBox.min.y};
    },

    render: function() {
        SS.ScaleArrowView.prototype.render.call(this);
        this.sceneObject.position.x = this.model.boundingBox.max.x + 1;
        this.sceneObject.position.y = this.model.boundingBox.min.y - 1;
        this.sceneObject.rotation.z = 7/4*Math.PI;
        this.postRender();
        return this;
    },
});


SS.ScaleBoxView = SS.SceneObjectView.extend({

    initialize: function() {
    SS.SceneObjectView.prototype.initialize.call(this);
        this.render();
    },
    
    render: function() {
        this.clear();
        
        var width  = this.model.boundingBox.max.x - this.model.boundingBox.min.x;
        var depth  = this.model.boundingBox.max.y - this.model.boundingBox.min.y;
        var height = this.model.boundingBox.max.z - this.model.boundingBox.min.z;

        var geometry = new THREE.CubeGeometry(width, depth, height);
    cube = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: SS.materials.lineColor, 
                                                                     wireframe: true}));
        
    cube.position.x = this.model.boundingBox.min.x + width/2;
    cube.position.y = this.model.boundingBox.min.y + depth/2;
    cube.position.z = this.model.boundingBox.min.z + height/2;
    this.sceneObject.add(cube);

        this.postRender();
        return this;
    },

});

SS.ScaleFootprintView = SS.SceneObjectView.extend({

    initialize: function() {
    SS.SceneObjectView.prototype.initialize.call(this);
        this.render();
    },

   
    render: function() {
        this.clear();
        
        var width  = this.model.boundingBox.max.x - this.model.boundingBox.min.x;
        var depth  = this.model.boundingBox.max.y - this.model.boundingBox.min.y;
        var height = this.model.boundingBox.max.z - this.model.boundingBox.min.z;

        var planeGeometry = new THREE.PlaneGeometry(width, depth); 
        var planeMesh = new THREE.Mesh(planeGeometry, 
                                       new THREE.MeshBasicMaterial({color: SS.materials.faceColor, 
                                                                    transparent: true, 
                                                                    opacity: 0.2}));
        var planeBorder = new THREE.Mesh(planeGeometry, 
                                         new THREE.MeshBasicMaterial({color: SS.materials.lineColor, 
                                                                      wireframe: true}));

        planeMesh.doubleSided = true;

        planeMesh.position.x = this.model.boundingBox.min.x + width/2;
        planeMesh.position.y = this.model.boundingBox.min.y + depth/2;
        planeMesh.position.z = -0.05;
        planeMesh.rotation.x = Math.PI/2;
        planeBorder.position = planeMesh.position;
        planeBorder.rotation.x = Math.PI/2;

    this.sceneObject.add(planeMesh);
    this.sceneObject.add(planeBorder);

        this.postRender();
        return this;
    },

});


SS.ScaleFactorText = SS.DimensionText.extend({

    render: function() {
        this.clear();

        var factor = this.model.transform.parameters.factor;

        this.$factor = this.addElement('<div class="dimension">' + factor + '</div>');
        this.update();
    },

    update: function() {
            
        var factor = this.model.transform.parameters.factor;
        var boundingBox = SS.boundingBoxForGeomNode(this.model.editingNode);
        var center = SS.centerOfGeom(boundingBox);
        
        this.moveToScreenCoordinates(this.$factor, 
                                     new THREE.Vector3(boundingBox.max.x, center.y, 0));
    },

});
