import { FC, memo, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from 'three'

type EnemyBox = {
    box: THREE.Mesh;
    isMoveing: boolean;
}

export const Game = () => {
    // サイズを指定
    const DISPLAY_WIDTH = 960;
    const DISPLAY_HEIGHT = 540;
    const FIELD_LIMIT = 500;
    const BOX_HALF_SIZE = 100;
    const BOX_START_POSITION_Z = -2000;
    const BOX_MOVEMENT = 10;
    const CAMERA_FIELD_OF_VIEW = 90; //視野(度)
    const CAMERA_POSITION_X = 500;
    const CAMERA_POSITION_Z = 1000;
    const PLAYER_HALF_SIZE = 35;
    const PLAYER_POSITION_Z = 500;
    const HIT_PLAY = 15; //当たり判定のあそび


    //スタート状態を保持するステート
    const [gameStatus, setGameStatus] = useState<boolean>(true);

    //canvas要素を保持
    const canvasRef = useRef(HTMLCanvasElement.prototype);
    //スタート状態を保持
    const gameStatusRef = useRef(true);
    //マウスポジションを保持
    const mousePositionYRef = useRef(0);

    //スタート状態をステートからuseRefに代入（更新されたステートをタイマー処理内で使用するため）
    gameStatusRef.current = gameStatus;

    useEffect(() => {

        //マウスムーブイベントを定義
        canvasRef.current.addEventListener('mousemove', function (evt) {
            var mousePos = getMousePosition(canvasRef.current, evt);
            //プレイヤーの中心からのY座標
            mousePositionYRef.current = ((DISPLAY_HEIGHT / 2) - mousePos.y) * (FIELD_LIMIT * 2 / DISPLAY_HEIGHT);
        }, false);

        //プレイヤーの移動とマウスカーソルの移動を調整する倍率を計算
        const movementMagnification = calc();

        //レンダラーを作成
        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(DISPLAY_WIDTH, DISPLAY_HEIGHT);

        // シーンを作成
        const scene = new THREE.Scene();

        // カメラを作成
        const camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW, DISPLAY_WIDTH / DISPLAY_HEIGHT, 0.1, 2000);
        camera.position.set(CAMERA_POSITION_X, 0, CAMERA_POSITION_Z);

        //天井
        const roofGeometry = new THREE.BoxGeometry(400, FIELD_LIMIT * 2, 8000);
        const roofMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, FIELD_LIMIT * 2, -3000)
        scene.add(roof);
        //床 
        const floorGeometry = new THREE.BoxGeometry(400, FIELD_LIMIT * 2, 8000);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(0, -FIELD_LIMIT * 2, -3000)
        scene.add(floor);

        //プレイヤーを作成
        const playerGeometry = new THREE.SphereGeometry(PLAYER_HALF_SIZE, 50, 50);
        const playerMaterial = new THREE.MeshToonMaterial({ color: 'red' });
        const player = new THREE.Mesh(playerGeometry, playerMaterial);
        player.position.set(0, -(FIELD_LIMIT - PLAYER_HALF_SIZE), PLAYER_POSITION_Z)
        scene.add(player);

        // 平行光源
        const directionalLight = new THREE.DirectionalLight('red');
        directionalLight.position.set(1, 1, 1);
        // シーンに追加
        scene.add(directionalLight);

        //ボックスを初期化
        let boxs: Array<EnemyBox> = [];
        let enemyBox: EnemyBox;
        for (let i = 0; i < 10; i++) {
            const boxGeometry = new THREE.BoxGeometry(BOX_HALF_SIZE * 2, BOX_HALF_SIZE * 2, BOX_HALF_SIZE * 2);
            const boxMaterial = new THREE.MeshNormalMaterial();
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.set(0, generateRundomHeight(), BOX_START_POSITION_Z)
            scene.add(box);
            enemyBox = { box: box, isMoveing: false };
            boxs.push(enemyBox)
        }

        //ループイベント起動時の時間を取得
        let lastTime = performance.now();
        //ループイベント起動
        tick();

        // 毎フレーム時に実行されるループイベント
        function tick() {
            if (gameStatusRef.current) {
                //時間ごとの動作量を計算
                var nowTime = performance.now()
                let time = nowTime - lastTime;
                lastTime = nowTime;
                const movement = (time / 10);//動作量

                //プレイヤーの移動
                if (mousePositionYRef.current * movementMagnification < (FIELD_LIMIT - PLAYER_HALF_SIZE) && mousePositionYRef.current * movementMagnification > -(FIELD_LIMIT - PLAYER_HALF_SIZE)) {
                    player.position.y = mousePositionYRef.current * movementMagnification;
                }

                //ボックスの移動
                boxs.map((value) => {

                    if (value.isMoveing === false) {
                        if (Math.random() * 10 >= 9.95) {
                            value.isMoveing = true;
                        }
                    }
                    else {
                        if (value.box.position.z <= CAMERA_POSITION_Z) {
                            //ボックスを移動
                            value.box.position.z += BOX_MOVEMENT * movement;

                            //当たり判定
                            if (value.box.position.z + BOX_HALF_SIZE - (BOX_MOVEMENT * movement) >= PLAYER_POSITION_Z - PLAYER_HALF_SIZE + HIT_PLAY && value.box.position.z - BOX_HALF_SIZE - (BOX_MOVEMENT * movement) <= PLAYER_POSITION_Z + PLAYER_HALF_SIZE - HIT_PLAY) {
                                if (value.box.position.y + BOX_HALF_SIZE >= player.position.y - PLAYER_HALF_SIZE + HIT_PLAY && value.box.position.y - BOX_HALF_SIZE <= player.position.y + PLAYER_HALF_SIZE - HIT_PLAY) {
                                    // console.log((value.box.position.y + BOX_HALF_SIZE) + ">=" + (player.position.y - PLAYER_HALF_SIZE - HIT_PLAY))
                                }
                            }
                        } else {
                            //ボックスの位置をリセット
                            value.box.position.set(0, generateRundomHeight(), BOX_START_POSITION_Z)
                            value.isMoveing = false;
                        }
                    }
                })

                // 原点方向を見つめる
                camera.lookAt(new THREE.Vector3(0, 0, 0));
                // レンダリング
                renderer.render(scene, camera);

            }

            requestAnimationFrame(tick);
        }
    }, [])

    //マウスポジションを取得
    function getMousePosition(canvas: HTMLCanvasElement, evt: HTMLElementEventMap['mousemove']) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    //高さをランダムに生成
    function generateRundomHeight(): number {
        return (Math.random() - 0.5) * (FIELD_LIMIT * 2 - BOX_HALF_SIZE * 2);
    }

    //プレイヤーの位置に対する移動距離の倍率を計算
    function calc(): number {
        let theta0 = Math.atan(CAMERA_POSITION_Z / CAMERA_POSITION_X); //ラジアン
        let theta1 = Math.atan((CAMERA_POSITION_Z - PLAYER_POSITION_Z) / CAMERA_POSITION_X); //ラジアン
        let theta2 = (theta0 / (Math.PI / 180) - CAMERA_FIELD_OF_VIEW / 2) * (Math.PI / 180); //ラジアン

        return Math.cos(theta2) / Math.cos(theta1);
    }

    const onStart = useCallback(() => setGameStatus(true), []);
    const onStop = useCallback(() => setGameStatus(false), []);
    return (
        <>
            <canvas ref={canvasRef} />
            <button onClick={onStart}>スタート</button>
            <button onClick={onStop}>ストップ</button>
        </>

    )
}