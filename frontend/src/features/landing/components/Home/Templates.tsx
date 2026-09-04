export function Templates() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-nova-dark mb-6">
            Начните с{" "}
            <span className="relative">
              <span className="relative z-10">готового шаблона</span>
              <span className="absolute bottom-1 left-0 w-full h-3 bg-nova-yellow -z-0 opacity-60"></span>
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            Выберите из сотен профессиональных шаблонов для мозгового штурма,
            планирования и совместной работы
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          <div className="group bg-white rounded-2xl border border-gray-200 hover:border-nova-blue hover:shadow-[0_20px_40px_-15px_rgba(66,98,255,0.15)] transition-all duration-300 flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nova-blue to-nova-purple transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>

            <div className="h-52 bg-gradient-to-br from-blue-50/50 to-purple-50/50 relative p-6 flex items-center justify-center overflow-hidden group-hover:bg-blue-50/30 transition-colors">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(#4262FF 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              ></div>

              <div className="relative z-10 w-full max-w-[200px] h-32 bg-white rounded-xl shadow-sm border border-gray-100 p-4 transform group-hover:scale-105 group-hover:-rotate-1 transition-all duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-nova-blue/10 flex items-center justify-center text-nova-blue">
                    <i className="fas fa-lightbulb text-sm"></i>
                  </div>
                  <div className="h-2 w-20 bg-gray-100 rounded-full"></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 bg-yellow-100 rounded-lg border border-yellow-200 transform rotate-2"></div>
                  <div className="h-12 bg-blue-100 rounded-lg border border-blue-200 transform -rotate-1"></div>
                  <div className="h-12 bg-green-100 rounded-lg border border-green-200 transform -rotate-2"></div>
                  <div className="h-12 bg-purple-100 rounded-lg border border-purple-200 transform rotate-1"></div>
                </div>

                <div className="absolute -right-4 -top-4 w-10 h-10 bg-white rounded-lg shadow-md border border-gray-100 flex items-center justify-center transform rotate-12 group-hover:rotate-45 transition-transform duration-500 delay-75">
                  <i className="fas fa-plus text-gray-400 text-xs"></i>
                </div>
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-blue-50 text-nova-blue text-xs font-bold uppercase tracking-wider rounded-full mb-3">
                  Ideation
                </span>
                <h3 className="text-2xl font-bold text-nova-dark group-hover:text-nova-blue transition-colors">
                  Мозговой штурм
                </h3>
              </div>

              <p className="text-gray-600 mb-8 line-clamp-3">
                Пространство для генерации идей. Включает готовые наборы
                стикеров, таймер и инструменты для голосования.
              </p>

              <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    3+
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                    <i className="fas fa-user-plus"></i>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-gray-50 text-nova-dark flex items-center justify-center hover:bg-nova-blue hover:text-white transition-all shadow-sm hover:shadow-md">
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl border border-gray-200 hover:border-nova-green hover:shadow-[0_20px_40px_-15px_rgba(5,199,147,0.15)] transition-all duration-300 flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nova-green to-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>

            <div className="h-52 bg-gradient-to-br from-green-50/50 to-teal-50/50 relative p-6 flex items-center justify-center overflow-hidden group-hover:bg-green-50/30 transition-colors">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "linear-gradient(0deg, transparent 24%, #e5e7eb 25%, #e5e7eb 26%, transparent 27%, transparent 74%, #e5e7eb 75%, #e5e7eb 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #e5e7eb 25%, #e5e7eb 26%, transparent 27%, transparent 74%, #e5e7eb 75%, #e5e7eb 76%, transparent 77%, transparent)",
                  backgroundSize: "30px 30px",
                }}
              ></div>

              <div className="relative z-10 w-full max-w-[220px] bg-white rounded-xl shadow-sm border border-gray-100 p-4 transform group-hover:scale-105 transition-all duration-500">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-nova-green"></div>
                    <div className="h-1.5 w-16 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="h-4 w-12 bg-green-50 rounded text-[8px] flex items-center justify-center text-green-600 font-bold">
                    Q1 2026
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 text-[8px] text-gray-400 text-right">
                      Jan
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-nova-green rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 text-[8px] text-gray-400 text-right">
                      Feb
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full w-1/2 bg-blue-400 rounded-full ml-4"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 text-[8px] text-gray-400 text-right">
                      Mar
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-purple-400 rounded-full ml-8"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-green-50 text-nova-green text-xs font-bold uppercase tracking-wider rounded-full mb-3">
                  Strategy
                </span>
                <h3 className="text-2xl font-bold text-nova-dark group-hover:text-nova-green transition-colors">
                  Планирование
                </h3>
              </div>

              <p className="text-gray-600 mb-8 line-clamp-3">
                Постройте дорожную карту проекта. Визуализируйте этапы,
                назначайте ответственных и отслеживайте прогресс.
              </p>

              <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    5+
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                    <i className="fas fa-users"></i>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-gray-50 text-nova-dark flex items-center justify-center hover:bg-nova-green hover:text-white transition-all shadow-sm hover:shadow-md">
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl border border-gray-200 hover:border-nova-purple hover:shadow-[0_20px_40px_-15px_rgba(157,108,255,0.15)] transition-all duration-300 flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-nova-purple to-pink-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>

            <div className="h-52 bg-gradient-to-br from-purple-50/50 to-pink-50/50 relative p-6 flex items-center justify-center overflow-hidden group-hover:bg-purple-50/30 transition-colors">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(#9D6CFF 1px, transparent 1px)",
                  backgroundSize: "15px 15px",
                }}
              ></div>

              <div className="relative z-10 w-full max-w-[200px] flex gap-3 transform group-hover:translate-y-[-5px] transition-transform duration-500">
                <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 p-2 flex flex-col gap-2 group-hover:mt-4 transition-all duration-500">
                  <div className="h-1.5 w-8 bg-green-200 rounded-full mb-1"></div>
                  <div className="h-8 bg-green-50 rounded border border-green-100"></div>
                  <div className="h-8 bg-green-50 rounded border border-green-100"></div>
                </div>
                <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 p-2 flex flex-col gap-2 transition-all duration-500">
                  <div className="h-1.5 w-8 bg-red-200 rounded-full mb-1"></div>
                  <div className="h-8 bg-red-50 rounded border border-red-100"></div>
                  <div className="h-6 bg-red-50/50 rounded border border-dashed border-red-200"></div>
                </div>
                <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 p-2 flex flex-col gap-2 group-hover:mt-2 transition-all duration-500">
                  <div className="h-1.5 w-8 bg-purple-200 rounded-full mb-1"></div>
                  <div className="h-10 bg-purple-50 rounded border border-purple-100 flex items-center justify-center">
                    <i className="fas fa-check text-purple-300 text-[10px]"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-purple-50 text-nova-purple text-xs font-bold uppercase tracking-wider rounded-full mb-3">
                  Agile
                </span>
                <h3 className="text-2xl font-bold text-nova-dark group-hover:text-nova-purple transition-colors">
                  Ретроспектива
                </h3>
              </div>

              <p className="text-gray-600 mb-8 line-clamp-3">
                Анализируйте спринты и улучшайте процессы. Шаблоны для
                Start/Stop/Continue, 4L и других форматов.
              </p>

              <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    8+
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                    <i className="fas fa-users"></i>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full bg-gray-50 text-nova-dark flex items-center justify-center hover:bg-nova-purple hover:text-white transition-all shadow-sm hover:shadow-md">
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <a
            href="#"
            className="inline-flex items-center text-nova-dark hover:text-nova-blue font-semibold text-lg group"
          >
            <span className="mr-2">Посмотреть все шаблоны</span>
            <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </a>
        </div>
      </div>
    </section>
  );
}
