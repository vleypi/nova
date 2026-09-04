export function SuccessStory() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-nova-blue-light/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-nova-dark mb-6">
            Команды, которые{" "}
            <span className="relative">
              <span className="relative z-10">уже создают</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-gradient-to-r from-nova-purple to-nova-pink -z-0 opacity-60"></span>
            </span>{" "}
            будущее
          </h2>
          <p className="text-xl text-gray-600">
            Посмотрите, как компании по всему миру используют нашу платформу для
            достижения невероятных результатов
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 cursor-pointer hover:shadow-2xl hover:border-green-400/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-100/50 rounded-full blur-3xl group-hover:bg-green-200/50 transition-colors duration-500"></div>

              <div className="relative z-10 flex justify-between items-start mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <i className="fab fa-spotify text-3xl text-green-500"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 leading-none">
                      Spotify
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">
                      Engineering
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full border border-green-100">
                  Agile
                </span>
              </div>

              <div className="relative z-10 mb-8 group-hover:translate-x-1 transition-transform duration-300">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-6xl font-extrabold text-gray-900 tracking-tight">
                    86x
                  </span>
                  <i className="fas fa-arrow-up text-2xl text-green-500 mb-2 animate-bounce"></i>
                </div>
                <p className="text-gray-600 font-medium border-l-2 border-green-500 pl-3">
                  Ускорение цикла релизов продуктовых команд
                </p>
              </div>

              <div className="flex items-end gap-1 h-8 mt-auto opacity-30 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-1.5 bg-green-500 rounded-t-sm h-3 group-hover:h-6 transition-all duration-300 ease-out"></div>
                <div className="w-1.5 bg-green-500 rounded-t-sm h-5 group-hover:h-8 transition-all duration-300 ease-out delay-75"></div>
                <div className="w-1.5 bg-green-500 rounded-t-sm h-2 group-hover:h-5 transition-all duration-300 ease-out delay-100"></div>
                <div className="w-1.5 bg-green-500 rounded-t-sm h-6 group-hover:h-4 transition-all duration-300 ease-out delay-150"></div>
                <div className="w-1.5 bg-green-500 rounded-t-sm h-4 group-hover:h-7 transition-all duration-300 ease-out delay-200"></div>

                <div className="ml-auto flex items-center gap-2 text-sm font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  Read story{" "}
                  <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                </div>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 cursor-pointer hover:shadow-2xl hover:border-purple-400/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-100/50 rounded-full blur-3xl group-hover:bg-purple-200/50 transition-colors duration-500"></div>

              <div className="relative z-10 flex justify-between items-start mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <i className="fab fa-slack text-3xl text-purple-600"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 leading-none">
                      Slack
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">
                      Customer Success
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider rounded-full border border-purple-100">
                  Remote
                </span>
              </div>

              <div className="relative z-10 mb-8 group-hover:translate-x-1 transition-transform duration-300">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-6xl font-extrabold text-gray-900 tracking-tight">
                    -47%
                  </span>
                </div>
                <p className="text-gray-600 font-medium border-l-2 border-purple-500 pl-3">
                  Сокращение количества непродуктивных встреч
                </p>
              </div>

              <div className="relative mt-auto h-10">
                <div className="absolute left-0 bottom-0 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white -ml-2 first:ml-0 z-30"></div>
                  <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white -ml-3 z-20"></div>
                  <div className="w-6 h-6 rounded-full bg-yellow-100 border-2 border-white -ml-3 z-10"></div>
                  <div className="text-xs text-gray-400 ml-2 font-medium">
                    +200 teams
                  </div>
                </div>

                <div className="absolute right-0 bottom-0 flex items-center gap-2 text-sm font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                  Read story{" "}
                  <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                </div>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 cursor-pointer hover:shadow-2xl hover:border-gray-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100/50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

              <div className="relative z-10 flex justify-between items-start mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <i className="fab fa-github text-3xl text-gray-900"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 leading-none">
                      GitHub
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">
                      DevOps
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-full border border-gray-200">
                  Hybrid
                </span>
              </div>

              <div className="relative z-10 mb-8 group-hover:translate-x-1 transition-transform duration-300">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-6xl font-extrabold text-gray-900 tracking-tight">
                    71%
                  </span>
                  <i className="fas fa-bolt text-2xl text-yellow-400 mb-2 group-hover:animate-pulse"></i>
                </div>
                <p className="text-gray-600 font-medium border-l-2 border-gray-800 pl-3">
                  Быстрее мерж пулл-реквестов (Time-to-merge)
                </p>
              </div>

              <div className="flex items-center mt-auto justify-between pt-2">
                <div className="flex items-center opacity-30 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                  <div className="flex flex-col items-center -my-1">
                    <div className="w-0.5 h-3 bg-gray-300"></div>
                    <div className="w-3 h-3 rounded-full border-2 border-gray-800 bg-white"></div>
                    <div className="w-0.5 h-3 bg-gray-300"></div>
                  </div>
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                  Read story{" "}
                  <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
