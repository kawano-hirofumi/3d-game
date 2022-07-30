import { FC, memo, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from 'three'
export const Game = () => {
    // サイズを指定
    const width = 960;
    const height = 540;
    let rot = 0;

    const [gameStatus, setGameStatus] = useState<boolean>(true);

    const canvasRef = useRef(HTMLCanvasElement.prototype);
    const gameStatusRef = useRef(true);

    gameStatusRef.current = gameStatus;

    useEffect(() => {
        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);

        // シーンを作成
        const scene = new THREE.Scene();

        // カメラを作成
        const camera = new THREE.PerspectiveCamera(100, width / height);
        camera.position.set(0, 0, +1000);

        // 円柱と円を入れるコンテナ(オブジェクトをまとめることができる)
        const container = new THREE.Object3D();
        scene.add(container);
        //円柱
        const geometry3 = new THREE.CylinderGeometry(160, 160, 50, 32);//頂点の半径,底の半径,高さ,横の角数(min:3,max:64),縦の角数(min:3,max:64)
        const material3 = new THREE.MeshPhongMaterial();
        const box3 = new THREE.Mesh(geometry3, material3);
        scene.add(box3);
        //円
        const geometry4 = new THREE.TorusGeometry(200, 30, 16, 100);//半径,太さ,円の垂直方向の角数,円の角数,角度
        const material4 = new THREE.MeshLambertMaterial({ color: 0x9999FF });
        const box4 = new THREE.Mesh(geometry4, material4);
        scene.add(box4);
        container.add(box3)
        container.add(box4)
        container.position.set(0, 0, 0);



        /** 星屑を作成します */
        function createStarField() {
            // 頂点情報を作詞絵
            const vertices = [];
            for (let i = 0; i < 1000; i++) {
                const x = 2000 * (Math.random() - 0.5);
                const y = 2000 * (Math.random() - 0.5);
                const z = 2000 * (Math.random() - 0.5);

                vertices.push(x, y, z);
            }

            // 形状データを作成
            const geometry0 = new THREE.BufferGeometry();//大量の頂点データを操作するときに便利
            geometry0.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

            // マテリアルを作成
            const material0 = new THREE.PointsMaterial({
                size: 10,
                color: "0xffffff",
            });

            // 物体を作成
            const mesh = new THREE.Points(geometry0, material0);
            scene.add(mesh);
        }

        createStarField();


        // 平行光源
        const directionalLight = new THREE.DirectionalLight('red');
        directionalLight.position.set(1, 1, 1);
        // シーンに追加
        scene.add(directionalLight);


        let lastTime = performance.now();
        tick();

        // 毎フレーム時に実行されるループイベントです
        function tick() {

            if (gameStatusRef.current) {
                //時間ごとの動作量を計算
                var nowTime = performance.now()
                let time = nowTime - lastTime;
                lastTime = nowTime;
                const movement = (time / 10);//動作量


                container.rotation.y -= 0.01 * movement;


                box3.rotation.x += 0.01 * movement;

                // 毎フレーム角度を0.5度ずつ足していく
                rot += 0.5;
                // ラジアンに変換する
                const radian = (rot * Math.PI) / 180;
                // 角度に応じてカメラの位置を設定
                camera.position.x = 1000 * Math.sin(radian);
                camera.position.z = 1000 * Math.cos(radian);
                // 原点方向を見つめる
                camera.lookAt(new THREE.Vector3(0, 0, 0));

                renderer.render(scene, camera); // レンダリング

            }

            requestAnimationFrame(tick);
        }
    }, [])

    const onStart = () => setGameStatus(true);
    const onStop = () => setGameStatus(false);
    return (
        <>
            <canvas ref={canvasRef} />
            <button onClick={onStart}>スタート</button>
            <button onClick={onStop}>ストップ</button>
        </>

    )
}