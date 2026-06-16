#!/usr/bin/env python3
import os
import sys
import subprocess
import paramiko

# Configure stdout/stderr to handle encoding errors on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')
    sys.stderr.reconfigure(encoding='utf-8', errors='backslashreplace')
except AttributeError:
    # Older Python versions might not have reconfigure
    pass

def load_env(env_path):
    """Simple parser for .env file to extract deployment variables."""
    env_vars = {}
    if not os.path.exists(env_path):
        return env_vars
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                env_vars[key.strip()] = val.strip().strip('"').strip("'")
    return env_vars

def run_local_cmd(cmd):
    """Runs a local command and returns its output and exit code."""
    env = os.environ.copy()
    if os.name == 'nt':
        git_path = r"C:\Program Files\Git\cmd"
        if os.path.exists(git_path) and git_path not in env.get("PATH", ""):
            env["PATH"] = git_path + os.pathsep + env.get("PATH", "")
            
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True, env=env)
        return res.stdout.strip(), 0
    except subprocess.CalledProcessError as e:
        return e.stderr.strip(), e.returncode

def check_local_git():
    """Checks the local git repository status before deploying."""
    print("[INFO] Проверка локального состояния Git...")
    
    # 1. Check if git repository
    if not os.path.exists('.git'):
        print("[ERROR] Ошибка: Текущая папка не является Git-репозиторием.")
        return False
        
    # 2. Get current branch
    branch, code = run_local_cmd("git rev-parse --abbrev-ref HEAD")
    if code != 0:
        print(f"[ERROR] Ошибка при получении текущей ветки: {branch}")
        return False
    print(f"[INFO] Текущая ветка: {branch}")

    # 3. Check for uncommitted changes
    status, code = run_local_cmd("git status --porcelain")
    if code == 0 and status:
        print("[WARN] Предупреждение: У вас есть незакоммиченные локальные изменения:")
        print(status)
        confirm = input("Продолжить деплой без коммита этих изменений? (y/n): ")
        if confirm.lower() != 'y':
            return False

    # 4. Check if we need to push
    print("[INFO] Получение информации из удаленного репозитория (git fetch)...")
    run_local_cmd("git fetch")
    
    # Compare HEAD with origin/branch
    unpushed, code = run_local_cmd(f"git log origin/{branch}..HEAD --oneline")
    if code == 0 and unpushed:
        print("[WARN] Предупреждение: Обнаружены локальные коммиты, которые еще не отправлены на GitHub:")
        print(unpushed)
        confirm = input("Отправить (git push) коммиты на GitHub перед деплоем? (y/n): ")
        if confirm.lower() == 'y':
            print("[INFO] Выполняется git push...")
            push_out, push_code = run_local_cmd(f"git push origin {branch}")
            if push_code != 0:
                print(f"[ERROR] Ошибка при выполнении git push: {push_out}")
                return False
            print("[SUCCESS] Коммиты успешно отправлены на GitHub.")
        else:
            confirm_anyway = input("Продолжить деплой БЕЗ отправки локальных коммитов? (y/n): ")
            if confirm_anyway.lower() != 'y':
                return False
                
    return True

def main():
    # Load env vars
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    os.chdir(project_root)
    
    env_path = os.path.join(project_root, ".env")
    env = load_env(env_path)
    
    host = env.get("DEPLOY_HOST")
    port = int(env.get("DEPLOY_PORT", "22"))
    user = env.get("DEPLOY_USER")
    password = env.get("DEPLOY_PASSWORD")
    path = env.get("DEPLOY_PATH", "/root/notebook")
    
    if not host or not user or not password:
        print("[ERROR] Ошибка: В файле .env не заданы настройки деплоя (DEPLOY_HOST, DEPLOY_USER, DEPLOY_PASSWORD).")
        print("Добавьте их в ваш .env по шаблону из .env.example.")
        sys.exit(1)
        
    # Check local git
    if not check_local_git():
        print("[INFO] Деплой отменен.")
        sys.exit(0)
        
    print(f"\n[INFO] Запуск деплоя на сервер {host}...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"[INFO] Подключение к {host}:{port} под пользователем {user}...")
        client.connect(host, port=port, username=user, password=password, timeout=15)
        print("[SUCCESS] Успешно подключено!")
        
        # Sequence of commands to run on the server
        commands = [
            f"echo '=== 1. Затягивание изменений из Git ===' && cd {path}/open_notebook_src && git fetch origin && git reset --hard origin/main",
            f"echo '=== 2. Пересборка и перезапуск контейнеров ===' && cd {path} && docker compose up -d --build open_notebook",
            f"echo '=== 3. Проверка статуса контейнеров ===' && cd {path} && docker compose ps"
        ]
        
        for cmd in commands:
            print(f"\n▶ Running: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            
            # Print output in real-time
            while True:
                line = stdout.readline()
                if not line:
                    break
                print(line, end="")
                
            # Print errors if any
            err_output = stderr.read().decode('utf-8', errors='ignore').strip()
            if err_output:
                print(f"[WARN] Сообщения/Ошибки:\n{err_output}")
                
        print("\n[SUCCESS] Деплой успешно завершен!")
        
    except Exception as e:
        print(f"\n[ERROR] Ошибка во время деплоя: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
