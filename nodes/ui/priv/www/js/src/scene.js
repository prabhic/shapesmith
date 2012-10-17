define(['src/trackball'], function(trackball) {

    var Model = Backbone.Model.extend({

        initialize: function(attributes) {
            this.view = new View({model: this});
        },

    });

    var View = Backbone.View.extend({

        initialize: function() {
            $('body').append(this.$el);

            _.extend(this, Backbone.Events);

            var that = this;
            window.addEventListener('keydown', function(event) {
                that.keydown(event)
            }, false);

            this.width = this.$el.width();
            this.height = this.$el.height();
            this.scene = new THREE.Scene();

            // Camera
            this.camera = new THREE.PerspectiveCamera(30, this.width/this.height, 1, 10000);
            this.camera.up = new THREE.Vector3(0,0,1);
            this.camera.position = new THREE.Vector3(0,0,1000);
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.scene.add(this.camera);

            // Renderer
            this.renderer = new THREE.WebGLRenderer({antialias: true});
            this.renderer.autoClear = true;
            this.renderer.setClearColorHex(0x080808, 0.0);
            this.renderer.setSize(this.width, this.height);
            this.renderer.sortObjects = false;

            // Lights
            this.scene.add(new THREE.AmbientLight(0x404040));
            this.pointLight1 = new THREE.PointLight( 0x888888 );
            this.pointLight1.position.set(1000, 1000, 1000);
            this.scene.add(this.pointLight1);

            var materials = [
                new THREE.MeshLambertMaterial( { ambient: 0x333333,  side: THREE.DoubleSide } ),
                new THREE.MeshBasicMaterial( { color: 0x00bb00, wireframe: true, transparent: true, opacity: 0.5, side: THREE.DoubleSide } ),
                new THREE.MeshBasicMaterial( { color: 0x00bb00, wireframe: false, transparent: true, opacity: 0.5, side: THREE.DoubleSide } ),
            ];
            var object = THREE.SceneUtils.createMultiMaterialObject( new THREE.CubeGeometry(50, 50, 50, 4, 4, 4), materials );
            this.scene.add(object);

            for (var x = -10; x < 10; ++x) {
                for (var y = -10; y < 10; ++y) {
                    object = THREE.SceneUtils.createMultiMaterialObject(
                        new THREE.CubeGeometry(5, 5, 5, 4, 4, 4), materials);
                    object.position = new THREE.Vector3(x*10, y*10, 0);
                    this.scene.add(object);

                }
            }


            this.el.appendChild(this.renderer.domElement);
            this.trackball = new trackball.Trackball(this.scene, this.camera);
            this.animate();
        },

        animate: function() {
            var that = this;
            var animateFn = function() {
                requestAnimationFrame(animateFn);
                that.render();
            }
            animateFn();
        },

        render: function() {
            var lastCameraPosition = this.camera.position.clone();
            this.trackball.updateCamera(this.scene);
            var dCameraPosition = new THREE.Vector3().sub(this.camera.position, lastCameraPosition);
            if (dCameraPosition.length() > 0.1) {
                this.trigger('cameraChange', this.camera.position);
                this.pointLight1.position = this.camera.position;
                this.renderer.render(this.scene, this.camera);
            }
        },

        id: 'scene',

        events: {
            'mousedown'      : 'mousedown',
            'mousemove'      : 'mousemove',
            'mouseup'        : 'mouseup',
            'mousewheel'     : 'mousewheel',
            'DOMMouseScroll' : 'mousewheel', // For Firefox
        },

        mouseup: function(event) {
            this.trackball.mouseup(event);
        },        

        mousedown: function(event) {
            this.trackball.mousedown(event);
        },        

        mousemove: function(event) {
            this.trackball.mousemove(event);
        },

        mousewheel: function(event) {
            this.trackball.mousewheel(event);
        },

        keydown: function(event) {
            this.trackball.keydown(event);
        },


    });
    
    return {
        Model: Model
    };

});