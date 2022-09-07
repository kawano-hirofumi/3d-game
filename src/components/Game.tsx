import { memo, useEffect, useRef, useState } from "react";
import * as THREE from 'three'

type EnemyBox = {
    box: THREE.Mesh;
    isMoveing: boolean;
}

export const Game = memo(() => {
    // サイズを指定
    const DISPLAY_WIDTH = 960; //ゲーム表示枠横幅
    const DISPLAY_HEIGHT = 540; //ゲーム表示枠高さ
    const FIELD_LIMIT = 500; //ゲームで移動できる高さ(実際は　+FIELD_LIMIT　～　-FIELD_LIMIT)
    const BOX_HALF_SIZE = 100; //ボックスのサイズ(実際は　+BOX_HALF_SIZE　～　-BOX_HALF_SIZE)
    const BOX_START_POSITION_Z = -2000; //ボックスのスタートポジション
    const BOX_MOVEMENT = 10; //ボックスの移動距離
    const BOX_APPEARANCE_RATE = 0.006; //ボックス出現率(0~1)
    const CAMERA_FIELD_OF_VIEW = 90; //カメラの視野(度)
    const CAMERA_POSITION_X = 500; //カメラのポジション（X軸）
    const CAMERA_POSITION_Z = 1000; //カメラのポジション（Z軸）
    const PLAYER_HALF_SIZE = 35; //プレイヤーの半径
    const PLAYER_POSITION_Z = 500; //プレイヤーのポジション（Z軸）
    const HIT_PLAY = 15; //当たり判定のあそび（通常の当たり判定はシビアすぎて面白くないため）


    //ゲームオーバーを保持するステート
    const [gameOver, setGameOver] = useState<boolean>(false);

    //canvas要素を保持
    const canvasRef = useRef<HTMLCanvasElement>(HTMLCanvasElement.prototype);
    //マウスポジションを保持
    const mousePositionYRef = useRef<number>(0);
    //ゲームオーバー状態を保持
    const gameOverRef = useRef<boolean>(true);
    //プレイ時間を保持
    const timeRef = useRef<number>();

    //スタート状態をステートからuseRefに代入（更新されたステートをタイマー処理内で使用するため）
    gameOverRef.current = gameOver;

    useEffect(() => {

        //マウスムーブイベントを定義
        canvasRef.current.addEventListener('mousemove', function (evt) {
            let mousePos = getMousePosition(canvasRef.current, evt);
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
        //リザルト用のスタート時間を保持
        let startTime = lastTime;
        //ループイベント起動
        tick();

        // 毎フレーム時に実行されるループイベント
        function tick() {
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
                    if (Math.random() <= BOX_APPEARANCE_RATE) {
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
                                //スコアタイムを取得
                                timeRef.current = Math.floor((nowTime - startTime) / 100) / 10;
                                //ゲーム終了
                                setGameOver(true);
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

            //ゲームオーバーならループを抜ける
            if (gameOverRef.current) {
                return;
            }

            //ループ
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

    return (
        <>
            {
                !gameOver ?
                    <>
                        <canvas ref={canvasRef} />
                    </>
                    :
                    <div style={{ height: DISPLAY_HEIGHT, width: DISPLAY_WIDTH, textAlign: "center" }}>
                        <p>ゲームオーバー</p>
                        <p>{timeRef.current}秒</p>
                        <button><a href="/3d-game/">リセット</a></button>
                    </div>
            }
        </>
    )
})