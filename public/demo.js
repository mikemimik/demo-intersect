
Matter.use('matter-wrap');

const Engine = Matter.Engine
const Render = Matter.Render;
const Runner = Matter.Runner
const Composite = Matter.Composite;
const Composites = Matter.Composites;
const Common = Matter.Common;
const MouseConstraint = Matter.MouseConstraint;
const Mouse = Matter.Mouse;
const World = Matter.World;
const Bodies = Matter.Bodies;

const Demo = {};
let engine;
let world;
let render;
let sceneWidth;
let sceneHeight;

Demo.init = function () {
    const canvasContainer = document.getElementById('canvas-container');

    // create engine
    engine = Engine.create();
    world = engine.world;

    // create renderer
    render = Render.create({
        // element: document.body,
        element: canvasContainer,
        engine: engine,
        options: {
            // width: Math.min(document.documentElement.clientWidth, 800),
            // height: Math.min(document.documentElement.clientHeight, 600),
            showAngleIndicator: false
        }
    });

    Render.run(render);

    // create runner
    const runner = Runner.create();
    Runner.run(runner, engine);

    Demo.fullscreen();

    window.addEventListener('deviceorientation', Demo.updateGravity, true);

    sceneWidth = document.documentElement.clientWidth;
    sceneHeight = document.documentElement.clientHeight;
    let boundsMax = engine.world.bounds.max;
    let renderOptions = render.options;
    const canvas = render.canvas;

    boundsMax.x = sceneWidth;
    boundsMax.y = sceneHeight;

    canvas.width = renderOptions.width = sceneWidth;
    canvas.height = renderOptions.height = sceneHeight;

    // add ground
    const offset = 5;
    World.add(world, [
        Bodies.rectangle(sceneWidth * 0.5, -offset, sceneWidth + 0.5, 50.5, { isStatic: true }),
        Bodies.rectangle(sceneWidth * 0.5, sceneHeight + offset, sceneWidth + 0.5, 50.5, { isStatic: true }),
        Bodies.rectangle(sceneWidth + offset, sceneHeight * 0.5, 50.5, sceneHeight + 0.5, { isStatic: true }),
        Bodies.rectangle(-offset, sceneHeight * 0.5, 50.5, sceneHeight + 0.5, { isStatic: true })
    ]);

    const stack = Composites.stack(100, 0, 10, 10, 10, 10, function(x, y) {
        return Bodies.circle(x, y, Common.random(15, 30), { restitution: 0.6, friction: 0.1 });
    });
    
    World.add(world, [
        // stack,
        // Bodies.polygon(200, 460, 3, 60),
        // Bodies.polygon(400, 460, 5, 60),
        // Bodies.rectangle(600, 460, 80, 80)
    ]);

    // add mouse control
    var mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });

    World.add(world, mouseConstraint);

    // keep the mouse in sync with rendering
    render.mouse = mouse;

    // fit the render viewport to the scene
    // Render.lookAt(render, {
    //     min: { x: 0, y: 0 },
    //     max: { x: 800, y: 600 }
    // });

    // wrapping using matter-wrap plugin
    const allBodies = Composite.allBodies(world);

    for (var i = 0; i < allBodies.length; i += 1) {
        allBodies[i].plugin.wrap = {
            min: { x: render.bounds.min.x - 100, y: render.bounds.min.y },
            max: { x: render.bounds.max.x + 100, y: render.bounds.max.y }
        };
    }

    // context for MatterTools.Demo
    return {
        engine: engine,
        runner: runner,
        render: render,
        canvas: render.canvas,
        stop: function() {
            Matter.Render.stop(render);
            Matter.Runner.stop(runner);
        },
        addBalls: function (num) {
            for (let i = 0; i < num; i++) {
                this.addBall();
            }
        },
        addBall: function () {
            var ball = Bodies.circle(Common.random(200, 400), 0, Common.random(15, 30), {restitution: 0.6, friction: 0.1 });
            World.add(world, [ ball ]);
        },
        delBall: function () {
            console.log('world:', world);
            const balls = world.bodies.filter(function (body) {
                return (body.label === "Circle Body");
            });
            console.log('balls:', balls);
            World.remove(world, balls.pop());
        },
    };
};

Demo.fullscreen = function () {
    let fullscreenElement = render.canvas;

    if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
        if (fullscreenElement.requestFullscreen) {
            fullscreenElement.requestFullscreen();
        } else if (fullscreenElement.mozRequestFullScreen) {
            fullscreenElement.mozRequestFullScreen();
        } else if (fullscreenElement.webkitRequestFullscreen) {
            fullscreenElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    }
};

Demo.updateGravity = function () {
    if (!engine) return;
    let orientation = window.orientation;
    let gravity = engine.world.gravity;

    if (orientation === 0) {
        gravity.x = Common.clamp(event.gamma, -90, 90) / 90;
        gravity.y = Common.clamp(event.beta, -90, 90) / 90;
    } else if (orientation === 180) {
        gravity.x = Common.clamp(event.gamma, -90, 90) / 90;
        gravity.y = Common.clamp(-event.beta, -90, 90) / 90;
    } else if (orientation === 90) {
        gravity.x = Common.clamp(event.beta, -90, 90) / 90;
        gravity.y = Common.clamp(-event.gamma, -90, 90) / 90;
    } else if (orientation === -90) {
        gravity.x = Common.clamp(-event.beta, -90, 90) / 90;
        gravity.y = Common.clamp(event.gamma, -90, 90) / 90;
    }
};

const socket = io();
let state;

function userConnecting() {
    console.log('connecting...')
    socket.emit('user:connecting');
}

socket.on('user:connected', function (data) {
    console.log('user:connected', data);
    // NOTE(mperrotte): add a ball for yourself when you join
    state.addBalls(1)
    
    // NOTE(mperrotte): add balls for everyone else currently connected
    state.addBalls(data.numUsers - 1);
});

socket.on('user:joined', function (data) {
    console.log('user:joined', data);
    // NOTE(mperrotte): add ball for when someone else joins
    state.addBalls(1);
});

socket.on('user:disconnected', function (data) {
    console.log('user:disconnected');
    // NOTE(mperrotte): remove ball when a user disconnects
    state.delBall();
});

socket.on('reconnect_error', function () {
    console.log('attempt to reconnect has failed');
});

window.addEventListener('load', function() {
    console.log('window load event');
    state = Demo.init();
    console.log('state:', state);
    userConnecting();
})